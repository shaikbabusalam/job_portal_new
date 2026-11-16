import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import { analyzeResume } from '../services/atsAnalyzer.js'

const HIRELAYER_PARSE_URL = 'https://hirelayer.co/api/v4/resumes/parse'
const HIRELAYER_MAX_BYTES = 4.5 * 1024 * 1024 // HireLayer's file size limit
const MIN_TEXT_LENGTH = 50

// Check the real file signature, not just the file name / mime type
const isPdf = (buf) => buf.length > 4 && buf.subarray(0, 4).toString('latin1') === '%PDF'
const isZip = (buf) => buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b

// Read text with our own parsers (fast, free, nothing leaves the server)
const extractTextLocally = async (file) => {
    const fileName = file.originalname.toLowerCase()

    if (fileName.endsWith('.pdf')) {
        const parser = new PDFParse({ data: Uint8Array.from(file.buffer) })
        try {
            const parsed = await parser.getText()
            return { text: parsed.text || '', pages: parsed.total || null }
        } finally {
            await parser.destroy()
        }
    }

    const result = await mammoth.extractRawText({ buffer: file.buffer })
    return { text: result.value || '', pages: null }
}

// Fallback: HireLayer reads scanned / image-based resumes with OCR.
// Only used when local extraction finds (almost) no text.
const extractTextWithHireLayer = async (file) => {
    // Strip whitespace, quotes and stray backslashes that sometimes end up in .env values
    const apiKey = (process.env.HIRELAYER_API_KEY || '').replace(/[\s"'\\]+$/g, '').trim()

    if (!apiKey) return ''
    if (file.size > HIRELAYER_MAX_BYTES) return ''

    try {
        const form = new FormData()
        form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname)

        const response = await fetch(HIRELAYER_PARSE_URL, {
            method: 'POST',
            headers: { 'X-API-Key': apiKey },
            body: form,
            signal: AbortSignal.timeout(150000) // scans can take a while
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

// POST /api/ats/analyze  (multipart: resume file + optional jobDescription)
export const analyzeResumeFile = async (req, res) => {
    try {
        const file = req.file

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload your resume as a PDF or DOCX file.'
            })
        }

        const jobDescription = String(req.body?.jobDescription || '').slice(0, 10000)
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

        // 1. Try our own parser first
        try {
            const extracted = await extractTextLocally(file)
            text = extracted.text
            pages = extracted.pages
        } catch (error) {
            console.error('Local extraction failed:', error.message)
        }

        // 2. If we got (almost) nothing, try HireLayer OCR
        if (text.trim().length < MIN_TEXT_LENGTH) {
            const fallbackText = await extractTextWithHireLayer(file)
            if (fallbackText.trim().length >= MIN_TEXT_LENGTH) {
                text = fallbackText
            }
        }

        if (text.trim().length < MIN_TEXT_LENGTH) {
            return res.status(422).json({
                success: false,
                message:
                    'We could not read any text from this file. It may be a scanned image or a design-heavy PDF. ' +
                    'ATS software cannot read these either, so export a text-based PDF or DOCX and try again.'
            })
        }

        const analysis = analyzeResume({ text, pages, jobDescription })

        return res.json({
            success: true,
            fileName: file.originalname,
            analysis
        })
    } catch (error) {
        console.error('ATS analysis error:', error.message)
        return res.status(500).json({
            success: false,
            message:
                'We could not analyze this file. Make sure it is a valid PDF or DOCX that is not password protected.'
        })
    }
}