import Company from '../models/Company.js';
import bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import generateToken from '../utils/generateToken.js';
import Job from '../models/Job.js';
import JobApplication from '../models/JobApplication.js';
import Interview from '../models/Interview.js';
import { Chat } from '../models/chatModel.js';

export const registerCompany = async (req, res) => {
  const { name, email, password } = req.body;
  const imageFile = req.file;

  if (!name || !email || !password || !imageFile) {
    return res.json({ success: false, message: 'Missing Details' });
  }

  try {
    const companyExists = await Company.findOne({ email });
    if (companyExists) {
      return res.json({ success: false, message: 'Company already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);

    const company = await Company.create({
      name,
      email,
      password: hashPassword,
      image: imageUpload.secure_url,
    });

    res.json({
      success: true,
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        image: company.image,
      },
      token: generateToken(company._id),
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const loginCompany = async (req, res) => {
  const { email, password } = req.body;

  try {
    const company = await Company.findOne({ email });
    if (!company) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, company.password);
    if (isMatch) {
      res.json({
        success: true,
        company: {
          _id: company._id,
          name: company.name,
          email: company.email,
          image: company.image,
        },
        token: generateToken(company._id),
      });
    } else {
      res.json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
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
      category,
    });

    await newJob.save();
    res.json({ success: true, newJob });
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

    return res.json({ success: true, applications });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getCompanyPostedJobs = async (req, res) => {
  try {
    const companyId = req.company._id;
    const jobs = await Job.find({ companyId });

    const jobsData = await Promise.all(
      jobs.map(async (job) => {
        const applicants = await JobApplication.find({ jobId: job._id });
        return { ...job.toObject(), applicants: applicants.length };
      })
    );

    res.json({ success: true, jobsData });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const changeJobApplicationsStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    const companyId = req.company._id;

    const application = await JobApplication.findOneAndUpdate(
      { _id: id, companyId },
      { status },
      { new: true }
    )
      .populate('userId', 'name email')
      .populate('jobId', 'title location')
      .populate('companyId', 'name');

    if (!application) {
      return res.json({ success: false, message: 'Application not found' });
    }

    if (status === 'Terminated' || status === 'Rejected') {
      await Interview.deleteMany({ applicationId: id, companyId });
      await Chat.deleteMany({
        jobId: application.jobId?._id || application.jobId,
        applicantId: String(application.userId?._id || application.userId),
        recruiterId: String(companyId),
      });
    }

    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const changeVisiblity = async (req, res) => {
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

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.body;
    const companyId = req.company._id;

    const job = await Job.findOneAndDelete({ _id: id, companyId });
    if (!job) {
      return res.json({ success: false, message: 'Job not found or unauthorized' });
    }

    await JobApplication.deleteMany({ jobId: id });
    await Interview.deleteMany({ jobId: id });
    await Chat.deleteMany({ jobId: id });

    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const scheduleInterview = async (req, res) => {
  try {
    const { applicationId, date, time, note } = req.body;
    const companyId = req.company._id;

    const application = await JobApplication.findOne({ _id: applicationId, companyId });
    if (!application) {
      return res.json({ success: false, message: 'Application not found' });
    }

    const interview = await Interview.create({
      applicationId,
      companyId,
      userId: application.userId,
      jobId: application.jobId,
      date,
      time,
      note: note || '',
    });

    res.json({ success: true, message: 'Interview scheduled', interview });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getCompanyInterviews = async (req, res) => {
  try {
    const companyId = req.company._id;
    const interviews = await Interview.find({ companyId })
      .populate('userId', 'name email image')
      .populate('jobId', 'title location');

    res.json({ success: true, interviews });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const updateInterview = async (req, res) => {
  try {
    const { id, date, time, note } = req.body;
    const companyId = req.company._id;

    const interview = await Interview.findOneAndUpdate(
      { _id: id, companyId },
      { date, time, note: note || '' },
      { new: true }
    );

    if (!interview) {
      return res.json({ success: false, message: 'Interview not found' });
    }

    res.json({ success: true, message: 'Interview updated', interview });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteInterview = async (req, res) => {
  try {
    const { id } = req.body;
    const companyId = req.company._id;

    await Interview.findOneAndDelete({ _id: id, companyId });
    res.json({ success: true, message: 'Interview removed' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};