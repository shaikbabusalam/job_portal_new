import React, { useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const ViewApplications = () => {
  const { backendUrl, companyToken } = useContext(AppContext)

  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('All Jobs')

  const [interviewDate, setInterviewDate] = useState('')
  const [interviewTime, setInterviewTime] = useState('')
  const [interviewNote, setInterviewNote] = useState('')
  const [selectedApplicant, setSelectedApplicant] = useState('')

  const [interviews, setInterviews] = useState([])

  // Fetch company job applications and database interviews
  const fetchCompanyData = async () => {
    try {
      setLoading(true)
      const [applicantsRes, interviewsRes] = await Promise.all([
        axios.get(backendUrl + '/api/company/applicants', {
          headers: { token: companyToken }
        }),
        axios.get(backendUrl + '/api/company/interviews', {
          headers: { token: companyToken }
        })
      ])

      if (applicantsRes.data.success) {
        setApplicants(applicantsRes.data.applications.reverse())
      } else {
        toast.error(applicantsRes.data.message)
      }

      if (interviewsRes.data.success) {
        setInterviews(interviewsRes.data.interviews)
      } else {
        toast.error(interviewsRes.data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  // Update application status (Accept / Reject)
  const changeJobApplicationStatus = async (id, status) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/company/change-status',
        { id, status },
        { headers: { token: companyToken } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchCompanyData()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  useEffect(() => {
    if (companyToken) {
      fetchCompanyData()
    }
  }, [companyToken])

  // Get unique job titles for filter dropdown
  const jobTitles = [...new Set(applicants.map(applicant => applicant.jobId?.title).filter(Boolean))]

  // Search and filter applicants
  const filteredApplications = applicants.filter(applicant => {
    if (!applicant.jobId || !applicant.userId) return false

    const searchText = search.toLowerCase()
    const userName = applicant.userId?.name || ''
    const jobTitle = applicant.jobId?.title || ''
    const location = applicant.jobId?.location || ''

    const matchesSearch =
      userName.toLowerCase().includes(searchText) ||
      jobTitle.toLowerCase().includes(searchText) ||
      location.toLowerCase().includes(searchText)

    const matchesJob =
      jobFilter === 'All Jobs' ||
      jobTitle === jobFilter

    return matchesSearch && matchesJob
  })

  // Schedule interview handler with database persistence
  const handleScheduleInterview = async (e) => {
    e.preventDefault()

    if (!selectedApplicant || !interviewDate || !interviewTime) {
      return toast.error('Please fill in all interview details.')
    }

    try {
      const { data } = await axios.post(
        backendUrl + '/api/company/schedule-interview',
        {
          applicationId: selectedApplicant,
          date: interviewDate,
          time: interviewTime,
          note: interviewNote
        },
        { headers: { token: companyToken } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchCompanyData()
        setInterviewDate('')
        setInterviewTime('')
        setInterviewNote('')
        setSelectedApplicant('')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  // Remove scheduled interview from database
  const removeInterview = async (id) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/company/delete-interview',
        { id },
        { headers: { token: companyToken } }
      )

      if (data.success) {
        toast.info(data.message)
        fetchCompanyData()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className='container mx-auto p-4 md:p-6'>

      {/* Page heading */}
      <div className='mb-6'>
        <h1 className='text-2xl font-semibold text-gray-800'>
          View Applications
        </h1>
        <p className='text-sm text-gray-500 mt-1'>
          Manage applicants and schedule interviews.
        </p>
      </div>

      {/* Search and filters */}
      <div className='max-w-6xl bg-white border border-gray-200 rounded-lg p-4 mb-5'>
        <div className='flex flex-col md:flex-row gap-3 justify-between'>

          <div className='relative flex-1'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='w-5 h-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <circle cx='11' cy='11' r='7' />
                <path d='m20 20-4-4' />
              </svg>
            </span>

            <input
              type='text'
              placeholder='Search by name, job title or location...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='w-full border border-gray-200 rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-500'
            />
          </div>

          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className='border border-gray-200 rounded-md px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white'
          >
            <option value='All Jobs'>All Jobs</option>
            {jobTitles.map((job, index) => (
              <option key={index} value={job}>
                {job}
              </option>
            ))}
          </select>

        </div>

        <div className='flex justify-between items-center mt-3 text-sm text-gray-500'>
          <p>
            Showing {filteredApplications.length} of {applicants.length} applications
          </p>

          <button
            onClick={() => {
              setSearch('')
              setJobFilter('All Jobs')
            }}
            className='text-blue-600 hover:underline'
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Applications table */}
      <div className='max-w-6xl bg-white border border-gray-200 rounded-lg overflow-visible'>
        <div className='overflow-x-auto rounded-lg'>
          <table className='w-full border-collapse text-left'>
            <thead>
              <tr className='border-b border-gray-200 bg-gray-50'>
                <th className='px-4 py-4 text-sm font-semibold text-gray-700'>#</th>
                <th className='px-4 py-4 text-sm font-semibold text-gray-700'>User name</th>
                <th className='px-4 py-4 text-sm font-semibold text-gray-700'>Job Title</th>
                <th className='px-4 py-4 text-sm font-semibold text-gray-700'>Location</th>
                <th className='px-4 py-4 text-sm font-semibold text-gray-700'>Resume</th>
                <th className='px-4 py-4 text-sm font-semibold text-gray-700'>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredApplications.map((applicant, index) => {
                const status = applicant.status || 'Pending'

                return (
                  <tr
                    key={applicant._id || index}
                    className='border-b border-gray-200 last:border-0 hover:bg-gray-50'
                  >
                    <td className='px-4 py-4 text-sm text-gray-600'>
                      {index + 1}
                    </td>

                    <td className='px-4 py-4'>
                      <div className='flex items-center gap-2'>
                        <img
                          className='w-8 h-8 rounded-full object-cover border border-gray-200'
                          src={applicant.userId?.image || assets.profile_img}
                          alt='User'
                        />
                        <div>
                          <p className='text-sm font-medium text-gray-800 whitespace-nowrap'>
                            {applicant.userId?.name || 'Applicant'}
                          </p>
                          <span className={`text-xs font-semibold ${
                            status === 'Accepted'
                              ? 'text-green-600'
                              : status === 'Rejected'
                              ? 'text-red-500'
                              : 'text-orange-500'
                          }`}>
                            {status}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className='px-4 py-4 text-sm text-gray-600 whitespace-nowrap'>
                      {applicant.jobId?.title || 'N/A'}
                    </td>

                    <td className='px-4 py-4 text-sm text-gray-600 whitespace-nowrap'>
                      {applicant.jobId?.location || 'Remote'}
                    </td>

                    <td className='px-4 py-4'>
                      {applicant.userId?.resume ? (
                        <a
                          href={applicant.userId.resume}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm hover:bg-blue-100 transition'
                        >
                          Resume
                          <img
                            className='w-3 h-3'
                            src={assets.resume_download_icon}
                            alt='Download'
                          />
                        </a>
                      ) : (
                        <span className='text-xs text-gray-400'>Not Available</span>
                      )}
                    </td>

                    <td className='py-2 px-4 border-b relative'>
                      {applicant.status === "Pending" ? (
                        <div className='relative inline-block text-left group'>
                          <button className='text-gray-500 action-button px-2 py-1 font-bold rounded hover:bg-gray-100'>...</button>
                          <div className='z-10 hidden absolute right-0 md:left-0 top-full flex-col bg-white border border-gray-200 rounded shadow-md group-hover:flex min-w-28'>
                            <button
                              onClick={() => changeJobApplicationStatus(applicant._id, 'Accepted')}
                              className='px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 transition'
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => changeJobApplicationStatus(applicant._id, 'Rejected')}
                              className='px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition'
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`text-xs font-semibold px-3 py-1 rounded-full inline-block ${
                          applicant.status === 'Accepted' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                        }`}>
                          {applicant.status}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {filteredApplications.length === 0 && (
                <tr>
                  <td colSpan='6' className='text-center py-10 text-gray-500 text-sm'>
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interview planner */}
      <div className='max-w-6xl mt-8'>
        <div className='mb-4'>
          <h2 className='text-xl font-semibold text-gray-800'>
            Interview Planner
          </h2>
          <p className='text-sm text-gray-500 mt-1'>
            Schedule interviews with shortlisted candidates.
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>

          {/* Schedule interview form */}
          <div className='bg-white border border-gray-200 rounded-lg p-5'>
            <div className='flex items-center gap-3 mb-5'>
              <div className='bg-blue-50 text-blue-600 p-3 rounded-lg'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='w-6 h-6'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={1.8}
                >
                  <rect x='3' y='5' width='18' height='16' rx='2' />
                  <path d='M16 3v4M8 3v4M3 10h18' />
                </svg>
              </div>

              <div>
                <h3 className='font-semibold text-gray-800'>
                  Schedule an interview
                </h3>
                <p className='text-xs text-gray-500'>
                  Add a new candidate interview
                </p>
              </div>
            </div>

            <form onSubmit={handleScheduleInterview} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Select Applicant
                </label>
                <select
                  required
                  value={selectedApplicant}
                  onChange={(e) => setSelectedApplicant(e.target.value)}
                  className='w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white'
                >
                  <option value=''>Choose an applicant</option>
                  {applicants
                    .filter(applicant => applicant.jobId && applicant.userId && applicant.status !== 'Rejected')
                    .map(applicant => (
                      <option key={applicant._id} value={String(applicant._id)}>
                        {applicant.userId?.name || 'Candidate'} - {applicant.jobId?.title || 'Position'}
                      </option>
                    ))}
                </select>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Interview Date
                  </label>
                  <input
                    type='date'
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className='w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm outline-none focus:border-blue-500'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Interview Time
                  </label>
                  <input
                    type='time'
                    required
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className='w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm outline-none focus:border-blue-500'
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Interview Notes (Optional)
                </label>
                <textarea
                  rows='3'
                  value={interviewNote}
                  onChange={(e) => setInterviewNote(e.target.value)}
                  placeholder='Add interview instructions or notes...'
                  className='w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm outline-none focus:border-blue-500 resize-none'
                />
              </div>

              <button
                type='submit'
                className='w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md text-sm font-medium transition'
              >
                + Schedule Interview
              </button>
            </form>
          </div>

          {/* Upcoming interviews */}
          <div className='bg-white border border-gray-200 rounded-lg p-5'>
            <div className='flex justify-between items-center mb-5'>
              <div>
                <h3 className='font-semibold text-gray-800'>
                  Upcoming Interviews
                </h3>
                <p className='text-xs text-gray-500 mt-1'>
                  Your scheduled candidate interviews
                </p>
              </div>

              <span className='bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full font-medium'>
                {interviews.length} Scheduled
              </span>
            </div>

            {interviews.length === 0 ? (
              <div className='flex flex-col items-center justify-center text-center py-10'>
                <div className='bg-gray-50 p-4 rounded-full mb-3'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='w-8 h-8 text-gray-400'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={1.5}
                  >
                    <rect x='3' y='5' width='18' height='16' rx='2' />
                    <path d='M16 3v4M8 3v4M3 10h18' />
                  </svg>
                </div>
                <p className='text-sm font-medium text-gray-700'>
                  No interviews scheduled
                </p>
                <p className='text-xs text-gray-400 mt-1'>
                  Your scheduled interviews will appear here.
                </p>
              </div>
            ) : (
              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {interviews
                  .slice()
                  .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
                  .map(interview => (
                    <div
                      key={interview._id}
                      className='border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition'
                    >
                      <div className='flex justify-between items-start gap-3'>
                        <div>
                          <h4 className='text-sm font-semibold text-gray-800'>
                            {interview.userId?.name || 'Candidate'}
                          </h4>
                          <p className='text-xs text-gray-500 mt-1'>
                            {interview.jobId?.title || 'Job Position'}
                          </p>
                        </div>

                        <button
                          onClick={() => removeInterview(interview._id)}
                          className='text-gray-400 hover:text-red-500 text-sm font-bold cursor-pointer'
                          title='Remove interview'
                        >
                          ✕
                        </button>
                      </div>

                      <div className='flex flex-wrap gap-4 mt-3 text-xs text-gray-600'>
                        <span className='flex items-center gap-1'>
                          <span className='text-blue-600'>📅</span>
                          {interview.date}
                        </span>

                        <span className='flex items-center gap-1'>
                          <span className='text-blue-600'>🕒</span>
                          {interview.time}
                        </span>
                      </div>

                      {interview.note && (
                        <p className='text-xs text-gray-500 mt-3 border-t pt-2'>
                          {interview.note}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}

export default ViewApplications