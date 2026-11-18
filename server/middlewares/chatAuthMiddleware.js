import jwt from 'jsonwebtoken';
import Company from '../models/Company.js';

export const protectChatUser = async (req, res, next) => {
  try {
    // 1. Check Recruiter JWT in 'token' header
    const companyToken = req.headers.token;
    if (companyToken) {
      const decoded = jwt.verify(companyToken, process.env.JWT_SECRET);
      const company = await Company.findById(decoded.id).select('_id name email image');
      if (!company) {
        return res.status(401).json({ success: false, message: 'Unauthorized recruiter account' });
      }
      req.chatUser = {
        id: String(company._id),
        role: 'recruiter',
      };
      return next();
    }

    // 2. Check Clerk Applicant Session
    const auth = typeof req.auth === 'function' ? req.auth() : req.auth;
    if (auth?.userId) {
      req.chatUser = {
        id: String(auth.userId),
        role: 'applicant',
      };
      return next();
    }

    return res.status(401).json({ success: false, message: 'Unauthorized: Valid login required' });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }
};