import React, { useEffect, useState, useRef, useContext } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

import { useLocation, useNavigate } from 'react-router-dom'
import { JobCategories, JobLocations } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const experienceLevels = [
  'Beginner level',
  'Intermediate level',
  'Senior level'
]

const buildInstantTemplate = ({ title, category, location, level, salary }) => {
  const skillText = `${category || 'modern'} tools and industry best practices`

  return `
    <p>We are looking for a motivated <strong>${title.trim()}</strong> to join our ${category || 'engineering'} team${location ? ` in <strong>${location}</strong>` : ''}.</p>
    <h2>Key Responsibilities</h2>
    <ul>
      <li>Design, build, and maintain reliable solutions for core business initiatives.</li>
      <li>Collaborate closely with cross-functional teams to ship features on schedule.</li>
      <li>Ensure high standards of performance, security, and maintainability.</li>
    </ul>
    <h2>Required Qualifications</h2>
    <ul>
      <li>Hands-on experience with <strong>${skillText}</strong>.</li>
      <li>${level || 'Relevant'} experience with strong analytical and problem-solving skills.</li>
      <li>Effective communication and teamwork in a fast-paced environment.</li>
    </ul>
    <h2>What We Offer</h2>
    <ul>
      <li>Competitive compensation${salary ? ` (₹${Number(salary).toLocaleString('en-IN')} per annum)` : ''} and growth opportunities.</li>
      <li>Supportive culture with flexible work options.</li>
    </ul>
  `.trim()
}

const AddJob = () => {
  const navigate = useNavigate()
  const locationState = useLocation()
  const { backendUrl, companyToken } = useContext(AppContext)

  const editingJob = locationState.state?.job

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState(JobLocations[0] || '')
  const [category, setCategory] = useState(JobCategories[0] || '')
  const [level, setLevel] = useState(experienceLevels[0])
  const [salary, setSalary] = useState('')
  const [generating, setGenerating] = useState(false)

  const editorRef = useRef(null)
  const quillRef = useRef(null)

  // Initialize Quill editor
  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: 'Write job description here...',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link'],
            ['clean']
          ]
        }
      })
    }
  }, [])

  // Load existing job details when editing
  useEffect(() => {
    if (editingJob) {
      setTitle(editingJob.title || '')
      setLocation(editingJob.location || JobLocations[0] || '')
      setCategory(editingJob.category || JobCategories[0] || '')
      setLevel(editingJob.level || experienceLevels[0])
      setSalary(editingJob.salary?.toString() || '')

      if (quillRef.current) {
        quillRef.current.clipboard.dangerouslyPasteHTML(
          editingJob.description || ''
        )
      }
    }
  }, [editingJob])

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    const description = quillRef.current?.root.innerHTML || ''
    const plainDescription = quillRef.current?.getText().trim() || ''

    if (!title.trim()) {
      toast.error('Please enter job title')
      return
    }

    if (!plainDescription) {
      toast.error('Please enter job description')
      return
    }

    if (!salary || Number(salary) <= 0) {
      toast.error('Please enter a valid salary')
      return
    }

    try {
      const jobData = {
        title: title.trim(),
        description,
        location,
        category,
        level,
        salary: Number(salary)
      }

      let endpoint = '/api/company/post-job'
      if (editingJob) {
        endpoint = '/api/company/edit-job'
        jobData.id = editingJob._id || editingJob.id
      }

      const { data } = await axios.post(
        backendUrl + endpoint,
        jobData,
        { headers: { token: companyToken } }
      )

      if (data.success) {
        toast.success(data.message || (editingJob ? 'Job updated successfully!' : 'Job added successfully!'))
        navigate('/dashboard/manage-jobs')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  // Instant draft + background AI enhancement
  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      toast.error('Enter the job title first')
      return
    }

    const hasText = (quillRef.current?.getText().trim() || '').length > 0
    if (hasText && !window.confirm('This will replace the current description. Continue?')) return

    const instantHtml = buildInstantTemplate({ title, category, location, level, salary })
    if (quillRef.current) {
      quillRef.current.clipboard.dangerouslyPasteHTML(instantHtml)
    }

    setGenerating(true)

    try {
      const { data } = await axios.post(
        backendUrl + '/api/ai/job-description',
        { title: title.trim(), category, location, level },
        { headers: { token: companyToken }, timeout: 6000 }
      )

      if (data.success && data.description && quillRef.current) {
        quillRef.current.clipboard.dangerouslyPasteHTML(data.description)
      }
      toast.success('Description ready! Review and edit before posting.')
    } catch {
      toast.success('Description drafted! Review and edit before posting.')
    } finally {
      setGenerating(false)
    }
  }

  const inputStyle =
    'w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition'

  const labelStyle =
    'block text-sm text-gray-700 mb-2'

  return (
    <div className="w-full max-w-3xl">

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          {editingJob ? 'Edit Job' : 'Add New Job'}
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          {editingJob
            ? 'Update your existing job details.'
            : 'Enter the details to publish a new job.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Job Title */}
        <div>
          <label className={labelStyle}>
            Job Title
          </label>

          <input
            type="text"
            placeholder="Type here"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputStyle}
            required
          />
        </div>

        {/* Job Description */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="block text-sm text-gray-700">
              Job Description
            </label>

            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={generating}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:bg-indigo-50 rounded-md px-3 py-1.5 transition disabled:opacity-50"
            >
              {generating ? 'Refining with AI...' : '✦ Generate with AI'}
            </button>
          </div>

          <div
            ref={editorRef}
            className="bg-white text-sm"
          />
        </div>

        {/* Category and Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <div>
            <label className={labelStyle}>
              Job Category
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputStyle}
              required
            >
              {JobCategories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelStyle}>
              Job Location
            </label>

            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputStyle}
              required
            >
              {JobLocations.map((loc, index) => (
                <option key={index} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Experience and Salary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <div>
            <label className={labelStyle}>
              Experience Level
            </label>

            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={inputStyle}
              required
            >
              {experienceLevels.map((item, index) => (
                <option key={index} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelStyle}>
              Annual Salary (₹)
            </label>

            <input
              type="number"
              min="1"
              placeholder="Enter salary"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className={inputStyle}
              required
            />
          </div>

        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="bg-black hover:bg-indigo-700 text-white px-10 py-3 rounded-md text-sm font-medium transition"
          >
            {editingJob ? 'UPDATE JOB' : 'ADD'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard/manage-jobs')}
            className="border border-gray-300 hover:bg-gray-100 text-gray-700 px-8 py-3 rounded-md text-sm font-medium transition"
          >
            CANCEL
          </button>
        </div>

      </form>
    </div>
  )
}

export default AddJob