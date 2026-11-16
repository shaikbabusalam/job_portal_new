import express from 'express';
import upload from '../config/multer.js'; // Make sure this path matches your project structure
import { applyForjob, getUserData, getUserJobApplications, updateUserResume, getUserInterviews } from '../controllers/userController.js'

const router = express.Router()

// get user data
router.get('/user', getUserData)

// apply for a job
router.post('/apply', applyForjob)

// get applied jobs data
router.get('/applications', getUserJobApplications)

// get scheduled interviews for user
router.get('/interviews', getUserInterviews)

// update user profile (resume)
router.post('/update-resume', upload.single('resume'), updateUserResume)

export default router