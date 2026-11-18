import React, { useContext, useRef, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { toast } from 'react-toastify'
import Navbar from '../components/Navbar'
import { AppContext } from '../context/AppContext'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const getScoreMeta = (score) => {
  if (score >= 85) return { color: '#16a34a' }
  if (score >= 70) return { color: '#2563eb' }
  if (score >= 50) return { color: '#d97706' }
  return { color: '#dc2626' }
}

const statusStyles = {
  pass: {
    icon: '✓',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  },
  partial: {
    icon: '!',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  },
  fail: {
    icon: '✕',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  }
}

const severityStyles = {
  critical: {
    label: 'Critical',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  },
  important: {
    label: 'Important',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  },
  tip: {
    label: 'Tip',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  }
}

// Circular score gauge
const ScoreRing = ({ score }) => {
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const hasScore = typeof score === 'number'
  const offset = hasScore ? circumference * (1 - score / 100) : circumference
  const { color } = getScoreMeta(score || 0)

  return (
    <div className="relative h-48 w-48">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          strokeWidth="14"
          className="stroke-indigo-100 dark:stroke-indigo-950"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms ease' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-5xl font-bold" style={{ color: hasScore ? color : undefined }}>
          {hasScore ? score : '--'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {hasScore ? 'out of 100' : 'Awaiting analysis'}
        </p>
      </div>
    </div>
  )
}

const ATSChecker = () => {
  const { backendUrl, jobs } = useContext(AppContext)
  const { getToken } = useAuth()
  const { isSignedIn } = useUser()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const handleFile = (selectedFile) => {
    if (!selectedFile) return

    const name = selectedFile.name.toLowerCase()

    // Check the extension as well, because some browsers send an empty mime type for .docx
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setMessage('Please upload a PDF or DOCX file.')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setMessage('File size must be less than 5 MB.')
      return
    }

    setFile(selectedFile)
    setResult(null)
    setMessage('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const removeFile = () => {
    setFile(null)
    setResult(null)
    setMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Fill the job description box from a job posted on Jobaora
  const handleJobSelect = (e) => {
    const id = e.target.value
    setSelectedJobId(id)

    if (!id) {
      setJobDescription('')
      return
    }

    const job = (jobs || []).find((item) => item._id === id)
    if (!job) return

    const plainText = (job.description || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    setJobDescription(`${job.title}. ${plainText}`)
  }

  const runAnalysis = async (withAi = false) => {
    if (!file) {
      setMessage('Please upload your resume first.')
      return
    }

    if (withAi && !isSignedIn) {
      setMessage('Please log in to get AI feedback.')
      return
    }

    if (withAi) setAiLoading(true)
    else setLoading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('resume', file)

      if (withAi) formData.append('ai', 'true')

      if (jobDescription.trim()) {
        formData.append('jobDescription', jobDescription.trim())
      }

      const config = { timeout: withAi ? 150000 : 120000 }

      if (withAi) {
        const token = await getToken()
        config.headers = { Authorization: `Bearer ${token}` }
      }

      const { data } = await axios.post(`${backendUrl}/api/ats/analyze`, formData, config)

      if (data.success) {
        setResult(data.analysis)

        if (withAi) {
          setAiFeedback(data.aiFeedback || null)
          if (data.aiError) setMessage(data.aiError)
          else toast.success('AI feedback ready!')
        } else {
          setAiFeedback(null)
          toast.success('Resume analysis complete!')
        }
      } else {
        setResult(null)
        setMessage(data.message)
      }
    } catch (error) {
      // Keep an existing score on screen if only the AI request failed
      if (!withAi) setResult(null)
      setMessage(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
      setAiLoading(false)
    }
  }

  const handleAnalyze = () => runAnalysis(false)
  const handleAiFeedback = () => runAnalysis(true)

  const hasJobMatch = result?.keywordMatch?.mode === 'job-description'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 px-6 py-12 md:px-12 md:py-16 text-white">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
              ✦ AI Resume Intelligence
            </span>

            <h1 className="mt-6 text-3xl md:text-5xl font-bold leading-tight">
              Make Your Resume
              <br />
              <span className="text-indigo-200">ATS Ready</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm md:text-base leading-7 text-indigo-100">
              Upload your resume and discover opportunities to improve its
              ATS compatibility.
            </p>

            <div className="mt-7 flex flex-wrap gap-5 text-sm text-indigo-100">
              <span>✓ Resume Analysis</span>
              <span>✓ Skills Analysis</span>
              <span>✓ Improvement Insights</span>
            </div>
          </div>

          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 right-32 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />
        </section>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 mt-10">

          {/* Left column: upload + results */}
          <div className="lg:col-span-2 space-y-7 min-w-0">

            {/* Resume Upload */}
            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">

              <div className="flex items-center gap-3 mb-6">
                <div className="h-11 w-11 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xl">
                  📄
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Upload Your Resume
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload your latest resume for ATS analysis
                  </p>
                </div>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 px-5 py-16 text-center hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-3xl">
                  ⬆
                </div>

                <h3 className="font-semibold text-lg">
                  Drag and drop your resume here
                </h3>

                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  or click to browse files
                </p>

                <p className="mt-4 text-xs text-gray-400">
                  Supported formats: PDF, DOCX · Maximum size: 5 MB
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>

              {file && (
                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">📄</span>

                    <div className="min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={removeFile}
                    disabled={loading}
                    className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Optional job description */}
              <div className="mt-7 border-t border-gray-100 dark:border-gray-800 pt-6">
                <h3 className="font-semibold">
                  Match against a job <span className="text-xs font-normal text-gray-400">(optional)</span>
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Paste a job description, or pick a job posted on Jobaora, to see which keywords your resume is missing.
                </p>

                {jobs?.length > 0 && (
                  <select
                    value={selectedJobId}
                    onChange={handleJobSelect}
                    className="mt-4 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Select a job from Jobaora...</option>
                    {jobs.map((job, index) => (
                      <option key={job._id || index} value={job._id}>
                        {job.title}
                        {job.companyId?.name ? ` - ${job.companyId.name}` : ''}
                      </option>
                    ))}
                  </select>
                )}

                <textarea
                  rows={5}
                  maxLength={10000}
                  value={jobDescription}
                  onChange={(e) => {
                    setJobDescription(e.target.value)
                    setSelectedJobId('')
                  }}
                  placeholder="Paste the job description here..."
                  className="mt-3 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 resize-y"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 font-semibold text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing your resume...' : '✦ Analyze My Resume'}
              </button>

              {message && (
                <p className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 p-4 text-sm text-indigo-700 dark:text-indigo-300">
                  {message}
                </p>
              )}
            </section>

            {/* Results */}
            {result && (
              <>
                {/* Quick stats */}
                <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    ['Words', result.stats.wordCount],
                    ['Pages', result.stats.pages ?? 'N/A'],
                    ['Action verbs', result.stats.actionVerbs],
                    ['Measurable results', result.stats.quantifiedAchievements]
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center shadow-sm"
                    >
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{value}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    </div>
                  ))}
                </section>

                {/* AI resume coach */}
                <section className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">✦ AI resume coach</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Personal advice, stronger bullet points and jobs on Jobaora that fit your resume.
                      </p>
                    </div>

                    <button
                      onClick={handleAiFeedback}
                      disabled={aiLoading || loading}
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-60"
                    >
                      {aiLoading ? 'Thinking...' : aiFeedback ? 'Regenerate' : 'Get AI feedback'}
                    </button>
                  </div>

                  {!isSignedIn && (
                    <p className="mt-3 text-xs text-gray-400">Log in to use AI feedback.</p>
                  )}

                  {aiFeedback && (
                    <div className="mt-6 space-y-6">
                      {aiFeedback.summary && (
                        <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">{aiFeedback.summary}</p>
                      )}

                      {aiFeedback.strengths.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">What is working</h3>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
                            {aiFeedback.strengths.map((item, index) => <li key={index}>{item}</li>)}
                          </ul>
                        </div>
                      )}

                      {aiFeedback.improvements.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">What to improve</h3>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
                            {aiFeedback.improvements.map((item, index) => <li key={index}>{item}</li>)}
                          </ul>
                        </div>
                      )}

                      {aiFeedback.rewrittenBullets.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold">Stronger bullet points</h3>
                          <div className="mt-3 space-y-3">
                            {aiFeedback.rewrittenBullets.map((item, index) => (
                              <div key={index} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-sm">
                                <p className="text-gray-400 line-through">{item.original}</p>
                                <p className="mt-2 font-medium text-gray-800 dark:text-gray-100">{item.improved}</p>
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-gray-400">
                            Replace placeholders like [X%] with your real numbers. Only claim what is true.
                          </p>
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-semibold">Jobs that match your resume</h3>

                        {aiFeedback.recommendedJobs.length === 0 ? (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            No strong matches among the current openings yet.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {aiFeedback.recommendedJobs.map((job) => (
                              <Link
                                key={job.jobId}
                                to={`/apply-job/${job.jobId}`}
                                className="block rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition hover:border-indigo-400"
                              >
                                <p className="font-semibold">{job.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {[job.company, job.location].filter(Boolean).join(' · ')}
                                </p>
                                {job.reason && (
                                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{job.reason}</p>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* Suggestions */}
                <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
                  <h2 className="text-xl font-bold">How to improve your score</h2>

                  {result.suggestions.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      Great work! We found nothing major to fix.
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-4">
                      {result.suggestions.map((item, index) => {
                        const style = severityStyles[item.severity] || severityStyles.tip
                        return (
                          <li key={index} className="flex gap-3">
                            <span className={`mt-0.5 h-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                              {style.label}
                            </span>
                            <div>
                              <p className="text-sm font-semibold">{item.title}</p>
                              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{item.message}</p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>

                {/* Job keyword match */}
                {hasJobMatch && (
                  <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-xl font-bold">Job keyword match</h2>
                      <span className="rounded-full bg-indigo-100 dark:bg-indigo-950 px-3 py-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        {result.keywordMatch.matchPercent}% match
                      </span>
                    </div>

                    <div className="mt-5">
                      <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">
                        Found in your resume ({result.keywordMatch.matched.length})
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.keywordMatch.matched.length === 0 && (
                          <span className="text-sm text-gray-400">None yet.</span>
                        )}
                        {result.keywordMatch.matched.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-lg bg-green-100 dark:bg-green-900/40 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Missing from your resume ({result.keywordMatch.missing.length})
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.keywordMatch.missing.length === 0 && (
                          <span className="text-sm text-gray-400">Nothing missing. Nice!</span>
                        )}
                        {result.keywordMatch.missing.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-lg bg-red-100 dark:bg-red-900/40 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="mt-5 text-xs text-gray-400">
                      Only add keywords for skills you genuinely have.
                    </p>
                  </section>
                )}

                {/* Detailed breakdown */}
                <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
                  <h2 className="text-xl font-bold">Score breakdown</h2>

                  <div className="mt-6 space-y-8">
                    {result.breakdown.map((category) => (
                      <div key={category.key}>
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold">{category.label}</h3>
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                            {category.score} / {category.max}
                          </span>
                        </div>

                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(category.score / category.max) * 100}%`,
                              backgroundColor: getScoreMeta((category.score / category.max) * 100).color
                            }}
                          />
                        </div>

                        <ul className="mt-4 space-y-3">
                          {category.checks.map((check) => {
                            const style = statusStyles[check.status]
                            return (
                              <li key={check.label} className="flex items-start gap-3">
                                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.badge}`}>
                                  {style.icon}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">
                                    {check.label}
                                    <span className="ml-2 text-xs font-normal text-gray-400">
                                      {check.points}/{check.max}
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{check.note}</p>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Skills detected */}
                <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
                  <h2 className="text-xl font-bold">Skills we detected</h2>

                  {result.skillsFound.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      No recognised skills found. Add a Skills section listing your tools and technologies.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {result.skillsFound.map((group) => (
                        <div key={group.category}>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {group.category}
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {group.skills.map((skill) => (
                              <span
                                key={skill}
                                className="rounded-lg bg-indigo-50 dark:bg-indigo-950 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          {/* Right Section */}
          <aside className="space-y-6">

            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                ATS Compatibility Score
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {result ? `Analysis of ${file?.name || 'your resume'}` : 'Your resume score will appear here'}
              </p>

              <div className="my-8 flex justify-center">
                <ScoreRing score={result?.score} />
              </div>

              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-center">
                {result ? (
                  <>
                    <p
                      className="text-lg font-bold"
                      style={{ color: getScoreMeta(result.score).color }}
                    >
                      {result.label}
                    </p>

                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {Object.entries(result.sectionsDetected).map(([section, found]) => (
                        <span
                          key={section}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            found
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {found ? '✓' : '✕'} {section}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload your resume to get started.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-5">
                What We Analyze
              </h2>

              {[
                ['🎯', 'Keyword Matching', 'Identify important keywords in your resume.'],
                ['🧠', 'Skills Analysis', 'Identify relevant skills and experience.'],
                ['📊', 'Resume Quality', 'Review resume structure and readability.'],
                ['💡', 'Improvement Tips', 'Discover ways to improve your resume.']
              ].map((item, index) => (
                <div key={index} className="flex gap-3 mb-5 last:mb-0">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-lg">
                    {item[0]}
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm">{item[1]}</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                      {item[2]}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl bg-slate-900 p-6 text-white">
              <div className="text-2xl mb-3">🔒</div>
              <h3 className="font-semibold">Your Resume, Your Privacy</h3>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Your resume is analyzed in memory and is not stored by us.
                If we cannot read the text in your file (for example, a
                scanned PDF), it is sent to our resume-parsing partner
                HireLayer to extract the text. If you click AI feedback, your
                resume text is also sent to Claude (Anthropic) to write
                the advice.
              </p>
            </section>

          </aside>
        </div>
      </main>
    </div>
  )
}

export default ATSChecker