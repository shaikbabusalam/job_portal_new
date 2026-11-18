import express from 'express'
import { generateJobDescriptionHandler } from '../controllers/aiController.js'
import { protectCompany } from '../middlewares/authMiddleWare.js'
import { createRateLimiter, limitRequests } from '../utils/rateLimiter.js'

const router = express.Router()

// 15 AI generations per hour per company (the AI API costs money)
const limiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 15 })

router.post(
    '/job-description',
    protectCompany,
    limitRequests(limiter, (req) => req.company._id),
    generateJobDescriptionHandler
)

export default router