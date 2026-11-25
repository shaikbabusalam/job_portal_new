import { clerkClient } from '@clerk/express';
import User from '../models/user.js';
import JobApplication from '../models/JobApplication.js';
import Job from '../models/Job.js';
import Interview from '../models/Interview.js';
import { Chat } from '../models/chatModel.js';
import { v2 as cloudinary } from 'cloudinary';

export const getUserData = async (req, res) => {
  const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
  const userId = auth?.userId;

  if (!userId) {
    return res.json({ success: false, message: 'Unauthorized' });
  }

  try {
    let user = await User.findById(userId);

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.emailAddresses?.[0]?.emailAddress || `${userId}@clerk.local`;
      const fullName =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        clerkUser.username ||
        'User';

      user = await User.create({
        _id: userId,
        name: fullName,
        email,
        image: clerkUser.imageUrl || '',
        resume: '',
      });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const applyForJob = async (req, res) => {
  const { jobId } = req.body;
  const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
  const userId = auth?.userId;

  if (!userId) {
    return res.json({ success: false, message: 'Unauthorized' });
  }

  try {
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
      date: Date.now(),
    });

    res.json({ success: true, message: 'Applied Successfully' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getUserJobApplications = async (req, res) => {
  try {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    const userId = auth?.userId;

    const applications = await JobApplication.find({ userId })
      .populate('companyId', 'name email image')
      .populate('jobId', 'title description location category level salary')
      .exec();

    if (!applications) {
      return res.json({ success: false, message: 'No job applications found for this user.' });
    }

    return res.json({ success: true, applications });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const updateUserResume = async (req, res) => {
  try {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    const userId = auth?.userId;
    const resumeFile = req.file;
    const userData = await User.findById(userId);

    if (!userData) {
      return res.json({ success: false, message: 'User Not Found' });
    }

    if (resumeFile) {
      const resumeUpload = await cloudinary.uploader.upload(resumeFile.path);
      userData.resume = resumeUpload.secure_url;
    }

    await userData.save();
    return res.json({ success: true, message: 'Resume Updated' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteUserApplication = async (req, res) => {
  try {
    const { id } = req.body;
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    const userId = auth?.userId;

    const application = await JobApplication.findOneAndDelete({ _id: id, userId });
    if (!application) {
      return res.json({ success: false, message: 'Application not found' });
    }

    await Interview.deleteMany({ applicationId: id, userId });
    await Chat.deleteMany({
      jobId: application.jobId,
      applicantId: String(userId),
      recruiterId: String(application.companyId),
    });

    return res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getUserInterviews = async (req, res) => {
  try {
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    const userId = auth?.userId;

    const interviews = await Interview.find({ userId })
      .populate('companyId', 'name email image')
      .populate('jobId', 'title location');

    return res.json({ success: true, interviews });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};