import express from 'express'

import {
    changeJobApplicationStatus,
    changeVisibility,
    getCompanyData,
    getCompanyJobApplicants,
    getCompanyPostedJobs,
    loginCompany,
    postJob,
    registerCompany,
    deleteJob,
    scheduleInterview,
    getCompanyInterviews,
    deleteInterview
} from '../controllers/companyController.js'

import upload from '../config/multer.js'
import { protectCompany } from '../middlewares/authMiddleWare.js'

const router = express.Router()

router.post('/register', upload.single('image'), registerCompany)
router.post('/login', loginCompany)
router.get('/company', protectCompany, getCompanyData)
router.post('/post-job', protectCompany, postJob)
router.get('/applicants', protectCompany, getCompanyJobApplicants)
router.get('/list-jobs', protectCompany, getCompanyPostedJobs)
router.post('/delete-job', protectCompany, deleteJob)
router.post('/change-status', protectCompany, changeJobApplicationStatus)
router.post('/change-visibility', protectCompany, changeVisibility)

// Interview Planner Routes
router.post('/schedule-interview', protectCompany, scheduleInterview)
router.get('/interviews', protectCompany, getCompanyInterviews)
router.post('/delete-interview', protectCompany, deleteInterview)

export default router