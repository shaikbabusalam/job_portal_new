import { generateJobDescription, AiError } from '../services/aiService.js'

// POST /api/ai/job-description  (recruiter only)
export const generateJobDescriptionHandler = async (req, res) => {
    try {
        const { title, level, category, location, skills } = req.body

        if (!String(title || '').trim()) {
            return res.json({ success: false, message: 'Enter the job title first.' })
        }

        const description = await generateJobDescription({ title, level, category, location, skills })

        res.json({ success: true, description })
    } catch (error) {
        const isAi = error instanceof AiError
        if (!isAi) console.error('AI job description error:', error.message)

        res.status(isAi ? error.status : 500).json({
            success: false,
            message: isAi ? error.message : 'Could not generate the description.'
        })
    }
}