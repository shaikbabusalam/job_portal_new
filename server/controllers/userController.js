import User from '../models/user.js';
import JobApplication from '../models/JobApplication.js';
import Job from '../models/Job.js';
import Interview from '../models/Interview.js';
import { v2 as cloudinary } from 'cloudinary';
import { clerkClient } from '@clerk/express';

const getAuth = (req) => (typeof req.auth === 'function' ? req.auth() : req.auth);

export const getUserData = async (req, res) => {
    try {
        const auth = getAuth(req);
        const userId = auth?.userId;

        if (!userId) {
            return res.json({ success: false, message: 'Unauthorized: Missing user ID' });
        }

        let user = await User.findById(userId);
        if (!user) {
            const clerkUser = await clerkClient.users.getUser(userId);
            user = await User.create({
                _id: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Job Seeker',
                image: clerkUser.imageUrl || '',
                resume: ''
            });
        }

        res.json({ success: true, user });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const applyForjob = async (req, res) => {
    const { jobId } = req.body;

    try {
        const userId = getAuth(req)?.userId;
        if (!userId) {
            return res.json({ success: false, message: 'Unauthorized: Missing user ID' });
        }

        const isAlreadyApplied = await JobApplication.find({ jobId, userId });
        if (isAlreadyApplied.length > 0) {
            return res.json({ success: false, message: 'Already Applied' });
        }

        const jobData = await Job.findById(jobId);
        if (!jobData) {
            return res.json({ success: false, message: 'Job Not Found' });
        }

        await JobApplication.create({
            companyId: jobData.companyId,
            userId,
            jobId,
            date: Date.now()
        });

        res.json({ success: true, message: 'Applied Successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getUserJobApplications = async (req, res) => {
    try {
        const userId = getAuth(req)?.userId;
        if (!userId) {
            return res.json({ success: false, message: 'Unauthorized: Missing user ID' });
        }

        const applications = await JobApplication.find({ userId })
            .populate('companyId', 'name email image')
            .populate('jobId', 'title description location category level salary')
            .exec();

        if (!applications) {
            return res.json({ success: false, message: 'No job applications found' });
        }

        return res.json({ success: true, applications });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const updateUserResume = async (req, res) => {
    try {
        const userId = getAuth(req)?.userId;
        const resumeFile = req.file;

        if (!userId) {
            return res.json({ success: false, message: 'Unauthorized: Missing user ID' });
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (resumeFile) {
            const resumeUpload = await cloudinary.uploader.upload(resumeFile.path);
            userData.resume = resumeUpload.secure_url;
        }

        await userData.save();
        return res.json({ success: true, message: 'Resume Updated Successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getUserInterviews = async (req, res) => {
    try {
        const userId = getAuth(req)?.userId;
        if (!userId) {
            return res.json({ success: false, message: 'Unauthorized: Missing user ID' });
        }

        const interviews = await Interview.find({ userId })
            .populate('companyId', 'name email image')
            .populate('jobId', 'title location');

        res.json({ success: true, interviews });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};