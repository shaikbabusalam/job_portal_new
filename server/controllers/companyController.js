import Company from "../models/Company.js";
import bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import generateToken from "../utils/generateToken.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import Interview from "../models/Interview.js";
import { Chat } from "../models/chatModel.js";

export const registerCompany = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const imageFile = req.file;

        if (!name || !email || !password || !imageFile) {
            return res.json({ success: false, message: "missing Details" });
        }

        const companyExists = await Company.findOne({ email });
        if (companyExists) {
            return res.json({ success: false, message: "company already registered" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const imageUpload = await cloudinary.uploader.upload(imageFile.path);

        const company = await Company.create({
            name,
            email,
            password: hashPassword,
            image: imageUpload.secure_url
        });

        return res.json({
            success: true,
            company: {
                _id: company._id,
                name: company.name,
                email: company.email,
                image: company.image
            },
            token: generateToken(company._id)
        });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const loginCompany = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ success: false, message: "Missing email or password" });
        }

        const company = await Company.findOne({ email });
        if (!company) {
            return res.json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, company.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid email or password" });
        }

        return res.json({
            success: true,
            company: {
                _id: company._id,
                name: company.name,
                email: company.email,
                image: company.image
            },
            token: generateToken(company._id)
        });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const getCompanyData = async (req, res) => {
    try {
        const company = req.company;
        res.json({ success: true, company });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const postJob = async (req, res) => {
    const { title, description, location, salary, level, category } = req.body;
    const companyId = req.company._id;

    try {
        const newJob = new Job({
            title,
            description,
            location,
            salary,
            companyId,
            date: Date.now(),
            level,
            category
        });
        await newJob.save();
        res.json({ success: true, newJob });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const updateJob = async (req, res) => {
    try {
        const { id, title, description, location, salary, level, category } = req.body;
        const companyId = req.company._id;

        const job = await Job.findOne({ _id: id, companyId });
        if (!job) {
            return res.json({ success: false, message: "Job not found or unauthorized" });
        }

        job.title = title;
        job.description = description;
        job.location = location;
        job.salary = salary;
        job.level = level;
        job.category = category;

        await job.save();
        res.json({ success: true, message: "Job updated successfully", job });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getCompanyJobApplicants = async (req, res) => {
    try {
        const companyId = req.company._id;
        const applications = await JobApplication.find({ companyId })
            .populate('userId', 'name image resume')
            .populate('jobId', 'title location category level salary')
            .exec();

        res.json({ success: true, applications });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getCompanyPostedJobs = async (req, res) => {
    try {
        const companyId = req.company._id;
        const jobs = await Job.find({ companyId });

        const jobsData = await Promise.all(jobs.map(async (job) => {
            const applicants = await JobApplication.find({ jobId: job._id });
            return { ...job.toObject(), applicants: applicants.length };
        }));

        res.json({ success: true, jobsData });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const deleteJob = async (req, res) => {
    try {
        const { id } = req.body;
        const companyId = req.company._id;

        const job = await Job.findOne({ _id: id, companyId });
        if (!job) {
            return res.json({ success: false, message: "Job not found or unauthorized" });
        }

        await Job.findByIdAndDelete(id);
        await JobApplication.deleteMany({ jobId: id });
        await Interview.deleteMany({ jobId: id });

        return res.json({ success: true, message: "Job deleted successfully" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const changeJobApplicationStatus = async (req, res) => {
    try {
        const { id, status } = req.body;

        // Automatically delete rejected applications and any associated interviews
        if (status?.trim().toLowerCase() === 'rejected') {
            const deletedApp = await JobApplication.findByIdAndDelete(id);
            if (!deletedApp) {
                return res.json({ success: false, message: 'Application not found' });
            }
            await Interview.deleteMany({ applicationId: id });
            return res.json({ success: true, message: 'Application rejected and removed' });
        }

        const application = await JobApplication.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        )
            .populate('jobId', 'title')
            .populate('companyId', 'name');

        if (!application) {
            return res.json({ success: false, message: 'Application not found' });
        }

        // Automatically create chat room & initial acceptance message when accepted
        if (status?.trim().toLowerCase() === 'accepted') {
            const jobId = application.jobId?._id || application.jobId;
            const applicantId = String(application.userId);
            const recruiterId = String(application.companyId?._id || application.companyId);
            const companyName = application.companyId?.name || 'Our team';
            const jobTitle = application.jobId?.title || 'the position';

            let chat = await Chat.findOne({ jobId, applicantId, recruiterId });
            if (!chat) {
                await Chat.create({
                    jobId,
                    applicantId,
                    recruiterId,
                    messages: [
                        {
                            sender: recruiterId,
                            text: `Congratulations! ${companyName} has accepted your application for ${jobTitle}. Reply here to discuss next steps!`,
                        }
                    ]
                });
            }
        }

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const changeVisibility = async (req, res) => {
    try {
        const { id } = req.body;
        const companyId = req.company._id;

        const job = await Job.findById(id);
        if (companyId.toString() === job.companyId.toString()) {
            job.visible = !job.visible;
        }
        await job.save();
        res.json({ success: true, job });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const scheduleInterview = async (req, res) => {
    try {
        const { applicationId, date, time, note } = req.body;
        const companyId = req.company._id;

        if (!applicationId || !date || !time) {
            return res.json({ success: false, message: "Missing required interview details" });
        }

        const application = await JobApplication.findOne({ _id: applicationId, companyId });
        if (!application) {
            return res.json({ success: false, message: "Job application not found or unauthorized" });
        }

        const newInterview = await Interview.create({
            companyId,
            applicationId,
            userId: application.userId,
            jobId: application.jobId,
            date,
            time,
            note: note || ''
        });

        res.json({ success: true, message: "Interview scheduled successfully!", interview: newInterview });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getCompanyInterviews = async (req, res) => {
    try {
        const companyId = req.company._id;
        const interviews = await Interview.find({ companyId })
            .populate('userId', 'name image email')
            .populate('jobId', 'title location')
            .populate('applicationId', 'status');

        res.json({ success: true, interviews });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const deleteInterview = async (req, res) => {
    try {
        const { id } = req.body;
        const companyId = req.company._id;

        const interview = await Interview.findOne({ _id: id, companyId });
        if (!interview) {
            return res.json({ success: false, message: "Interview not found or unauthorized" });
        }

        await Interview.findByIdAndDelete(id);
        res.json({ success: true, message: "Interview removed successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};



export const updateInterview = async (req, res) => {
    try {
        const { id, date, time, note } = req.body;
        const companyId = req.company._id;

        if (!id || !date || !time) {
            return res.json({ success: false, message: "Missing required interview details" });
        }

        const interview = await Interview.findOneAndUpdate(
            { _id: id, companyId },
            { date, time, note: note || '' },
            { new: true }
        )
            .populate('userId', 'name image email')
            .populate('jobId', 'title location');

        if (!interview) {
            return res.json({ success: false, message: "Interview not found or unauthorized" });
        }

        res.json({ success: true, message: "Interview updated successfully!", interview });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};