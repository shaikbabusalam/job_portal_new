import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'
import { analyzeResume } from '../services/atsAnalyzer.js'
import { generateResumeFeedback, AiError } from '../services/aiService.js'
import { createRateLimiter } from '../utils/rateLimiter.js'
import Job from '../models/Job.js'

const HIRELAYER_PARSE_URL = 'https://hirelayer.co/api/v4/resumes/parse'
const HIRELAYER_MAX_BYTES = 4.5 * 1024 * 1024
const MIN_TEXT_LENGTH = 50

const getAuth = (req) => (typeof req.auth === 'function' ? req.auth() : req.auth)

// AI feedback costs money: 10 requests per hour per signed-in user
// (in-memory, so on serverless hosting the count can reset between requests)
const aiLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 })

// Newest visible jobs used for "recommended jobs"
const loadJobsForMatching = () =>
    Job.find({ visible: true })
        .sort({ date: -1 })
        .limit(40)
        .populate({ path: 'companyId', select: 'name' })
        .lean()

// Check actual file signatures
const isPdf = (buf) =>
    buf.length > 4 &&
    buf.subarray(0, 4).toString('latin1') === '%PDF'

const isZip = (buf) =>
    buf.length > 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b

// Extract text locally from PDF or DOCX (Vercel Serverless compatible)
const extractTextLocally = async (file) => {
    const fileName = file.originalname.toLowerCase()

    if (fileName.endsWith('.pdf')) {
        const pdf = await getDocumentProxy(new Uint8Array(file.buffer))
        const { totalPages, text } = await extractText(pdf, { mergePages: true })

        return {
            text: text || '',
            pages: totalPages || null
        }
    }

    const result = await mammoth.extractRawText({
        buffer: file.buffer
    })

    return {
        text: result.value || '',
        pages: null
    }
}

// HireLayer fallback OCR for scanned resumes
const extractTextWithHireLayer = async (file) => {
    const apiKey = (process.env.HIRELAYER_API_KEY || '')
        .replace(/[\s"'\\]+$/g, '')
        .trim()

    if (!apiKey) return ''
    if (file.size > HIRELAYER_MAX_BYTES) return ''

    try {
        const form = new FormData()
        form.append(
            'file',
            new Blob([file.buffer], { type: file.mimetype }),
            file.originalname
        )

        const response = await fetch(HIRELAYER_PARSE_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey
            },
            body: form,
            signal: AbortSignal.timeout(9000) // Stay under Vercel's 10s Hobby timeout
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
            console.error(
                `HireLayer error ${response.status}:`,
                data?.error?.code,
                data?.error?.message
            )
            return ''
        }

        return data?.resume?.info_resume?.text || ''
    } catch (error) {
        console.error('HireLayer request failed:', error.message)
        return ''
    }
}

// POST /api/ats/analyze
export const analyzeResumeFile = async (req, res) => {
    try {
        const file = req.file

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload your resume as a PDF or DOCX file.'
            })
        }

        // Optional AI coaching: needs a signed-in user
        const wantsAi = String(req.body?.ai) === 'true'

        if (wantsAi) {
            const userId = getAuth(req)?.userId

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Please log in to get AI feedback.'
                })
            }

            if (!aiLimiter.hit(userId)) {
                return res.status(429).json({
                    success: false,
                    message: 'You have reached the hourly limit for AI feedback. Please try again later.'
                })
            }
        }

        const jobDescription = String(
            req.body?.jobDescription || ''
        ).slice(0, 10000)

        const fileName = file.originalname.toLowerCase()
        const validPdf = fileName.endsWith('.pdf') && isPdf(file.buffer)
        const validDocx = fileName.endsWith('.docx') && isZip(file.buffer)

        if (!validPdf && !validDocx) {
            return res.status(400).json({
                success: false,
                message: 'The file content does not match a valid PDF or DOCX document.'
            })
        }

        let text = ''
        let pages = null

        // 1. Try local extraction
        try {
            const extracted = await extractTextLocally(file)
            text = extracted.text
            pages = extracted.pages
        } catch (error) {
            console.error('Local extraction failed:', error)
        }

        // 2. Use HireLayer if local extraction finds insufficient text
        if (text.trim().length < MIN_TEXT_LENGTH) {
            const fallbackText = await extractTextWithHireLayer(file)
            if (fallbackText.trim().length >= MIN_TEXT_LENGTH) {
                text = fallbackText
            }
        }

        // 3. Check extracted text
        if (text.trim().length < MIN_TEXT_LENGTH) {
            return res.status(422).json({
                success: false,
                message:
                    'We could not read any text from this file. It may be a scanned image or a design-heavy PDF. ' +
                    'ATS software cannot read these either, so export a text-based PDF or DOCX and try again.'
            })
        }

        // 4. Analyze resume
        const analysis = analyzeResume({
            text,
            pages,
            jobDescription
        })

        // 5. Optional AI feedback + job recommendations
        let aiFeedback = null
        let aiError = null

        if (wantsAi) {
            try {
                const jobs = await loadJobsForMatching()
                aiFeedback = await generateResumeFeedback({ text, analysis, jobs })
            } catch (error) {
                aiError = error instanceof AiError
                    ? error.message
                    : 'AI feedback is unavailable right now.'
                if (!(error instanceof AiError)) console.error('AI feedback error:', error.message)
            }
        }

        return res.json({
            success: true,
            fileName: file.originalname,
            analysis,
            aiFeedback,
            aiError
        })
    } catch (error) {
        console.error('ATS analysis error:', error)
        return res.status(500).json({
            success: false,
            message:
                'We could not analyze this file. Make sure it is a valid PDF or DOCX that is not password protected.'
        })
    }
}