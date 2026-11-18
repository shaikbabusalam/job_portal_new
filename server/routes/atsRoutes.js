
import express from 'express'
import multer from 'multer'

import {
    analyzeResumeFile
} from '../controllers/atsController.js'

const router = express.Router()

// Store uploaded resumes in memory
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },

    fileFilter: (req, file, cb) => {
        const name = file.originalname.toLowerCase()

        if (
            name.endsWith('.pdf') ||
            name.endsWith('.docx')
        ) {
            return cb(null, true)
        }

        cb(new Error('Only PDF and DOCX files are supported.'))
    }
})

// Handle upload errors
const uploadResume = (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (!err) return next()

        const message =
            err.code === 'LIMIT_FILE_SIZE'
                ? 'File size must be less than 5 MB.'
                : err.message

        return res.status(400).json({
            success: false,
            message
        })
    })
}

// Rate limiting
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 20

const hits = new Map()

const rateLimit = (req, res, next) => {
    const now = Date.now()
    const key = req.ip

    const entry = hits.get(key)

    if (!entry || now > entry.resetAt) {
        hits.set(key, {
            count: 1,
            resetAt: now + WINDOW_MS
        })

        return next()
    }

    if (entry.count >= MAX_REQUESTS) {
        return res.status(429).json({
            success: false,
            message: 'Too many requests. Please wait a few minutes and try again.'
        })
    }

    entry.count++
    next()
}

// Cleanup expired rate-limit entries
const cleanupInterval = setInterval(() => {
    const now = Date.now()

    for (const [key, entry] of hits) {
        if (now > entry.resetAt) {
            hits.delete(key)
        }
    }
}, WINDOW_MS)

cleanupInterval.unref()

// ATS resume analysis
router.post(
    '/analyze',
    rateLimit,
    uploadResume,
    analyzeResumeFile
)

export default router
