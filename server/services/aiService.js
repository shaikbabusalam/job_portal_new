/**
 * Google Gemini API integration optimized for near-instant responses
 * with automatic fallback templates.
 */

const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export class AiError extends Error {
  constructor(message, status = 500, code = 'AI_ERROR') {
    super(message)
    this.name = 'AiError'
    this.status = status
    this.code = code
  }
}

export const isAiConfigured = () => Boolean(process.env.GEMINI_API_KEY?.trim())

async function callGemini({ system, userMessage, maxTokens = 450 }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new AiError('GEMINI_API_KEY is not set on the server.', 503, 'AI_NOT_CONFIGURED')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000) // 5s max wait before instant fallback

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent?key=${apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 }
        },
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg = data?.error?.message || `Gemini API error (${res.status})`
      throw new AiError(msg, res.status, 'GEMINI_API_ERROR')
    }

    return (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || '')
      .join('\n')
      .trim()
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Generate job description in ~1s with instant fallback
 */
export async function generateJobDescription({ title, category, location, level, salary, skills, notes }) {
  try {
    const system = `You are an expert recruiter. Output ONLY clean, concise HTML for a rich-text editor using <p>, <h2>, <ul>, <li>, <strong>. No markdown code fences. Keep under 180 words.`
    const userMessage = [
      `Job Title: ${title}`,
      category && `Category: ${category}`,
      location && `Location: ${location}`,
      level && `Level: ${level}`,
      skills && `Key Skills: ${skills}`,
      salary && `Salary: ${salary}`,
      notes && `Notes: ${notes}`
    ].filter(Boolean).join('\n')

    const html = await callGemini({ system, userMessage, maxTokens: 420 })
    return html.replace(/^```html\s*|```$/gi, '').trim()
  } catch (error) {
    console.warn('Gemini AI fallback used:', error.message)

    const skillList = skills
      ? skills.split(',').map((s) => s.trim()).filter(Boolean).join(', ')
      : 'relevant modern technologies and workflows'

    return `
      <p>We are seeking a talented <strong>${title || 'Professional'}</strong> to join our team${location ? ` in ${location}` : ''}.</p>
      <h2>Key Responsibilities</h2>
      <ul>
        <li>Design, develop, and deliver high-quality solutions across key projects.</li>
        <li>Collaborate with cross-functional teams to ship reliable features on schedule.</li>
        <li>Maintain code quality, performance, and best engineering practices.</li>
      </ul>
      <h2>Required Qualifications</h2>
      <ul>
        <li>Hands-on experience with ${skillList}.</li>
        <li>${level || 'Relevant'} background with strong problem-solving skills.</li>
        <li>Clear communication and teamwork abilities.</li>
      </ul>
      <h2>What We Offer</h2>
      <ul>
        <li>Competitive compensation${salary ? ` (${salary})` : ''} and growth opportunities.</li>
        <li>Collaborative work environment with flexible options.</li>
      </ul>
    `.trim()
  }
}

export async function generateAtsCoaching({ resumeText, jobDescription, atsReport }) {
  try {
    const system = `You are a career coach and ATS specialist. Provide concise resume feedback in Markdown.`
    const userMessage = `Resume: ${resumeText?.slice(0, 4000)}${jobDescription ? `\nJob Description: ${jobDescription.slice(0, 1500)}` : ''}`
    return await callGemini({ system, userMessage, maxTokens: 450 })
  } catch (error) {
    return `### Executive Summary\nYour resume shows a solid foundational background. Focus on quantifying your achievements with metrics to boost your ATS match score.\n\n### Top High-Impact Fixes\n1. Add more target keywords from the job description into your experience section.\n2. Ensure standard headings (Experience, Education, Skills) are clearly labeled.\n3. Remove multi-column layouts that confuse automated ATS parsers.`
  }
}

export async function generateResumeFeedback(params = {}) {
  return generateAtsCoaching({
    resumeText: params.resumeText || params.text || '',
    jobDescription: params.jobDescription || params.jd || '',
    atsReport: params.atsReport || params.report || null,
  })
}