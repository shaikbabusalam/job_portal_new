import express from 'express';
import {
  registerCompany,
  loginCompany,
  getCompanyData,
  postJob,
  getCompanyJobApplicants,
  getCompanyPostedJobs,
  changeJobApplicationsStatus,
  changeVisiblity,
  deleteJob,
  scheduleInterview,
  getCompanyInterviews,
  updateInterview,
  deleteInterview,
} from '../controllers/companyController.js';
import upload from '../config/multer.js';
import { protectCompany } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', upload.single('image'), registerCompany);
router.post('/login', loginCompany);
router.get('/company', protectCompany, getCompanyData);
router.post('/post-job', protectCompany, postJob);
router.get('/applicants', protectCompany, getCompanyJobApplicants);
router.get('/list-jobs', protectCompany, getCompanyPostedJobs);
router.post('/change-status', protectCompany, changeJobApplicationsStatus);
router.post('/change-visibility', protectCompany, changeVisiblity);
router.post('/delete-job', protectCompany, deleteJob);
router.post('/schedule-interview', protectCompany, scheduleInterview);
router.get('/interviews', protectCompany, getCompanyInterviews);
router.post('/update-interview', protectCompany, updateInterview);
router.post('/delete-interview', protectCompany, deleteInterview);

export default router;