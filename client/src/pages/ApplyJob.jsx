import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import Loading from '../components/Loading'
import Navbar from '../components/Navbar'
import moment from 'moment'
import JobCard from '../components/JobCard'
import Footer from '../components/Footer'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '@clerk/clerk-react'

const ApplyJob = () => {
  const { id } = useParams()
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [isAlreadyApplied, setIsAlreadyApplied] = useState(false)
  const { jobs, backendUrl, userData, userApplications, fetchUserApplications } = useContext(AppContext)

  const [jobData, setJobData] = useState(null)

  const fetchJob = async () => {
    try {
      const { data } = await axios.get(backendUrl + `/api/jobs/${id}`)
      if (data.success) {
        setJobData(data.job)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const applyHandler = async () => {
    try {
      if (!userData) {
        return toast.error('Login to apply for jobs')
      }

      if (!userData.resume) {
        navigate('/applications')
        return toast.error('Upload resume to apply')
      }

      const token = await getToken()

      const { data } = await axios.post(
        backendUrl + '/api/users/apply',
        { jobId: jobData._id },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchUserApplications()
        setIsAlreadyApplied(true)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const checkAlreadyApplied = () => {
    const hasApplied = userApplications.some(item => item.jobId?._id === jobData?._id)
    setIsAlreadyApplied(hasApplied)
  }

  useEffect(() => {
    fetchJob()
  }, [id, jobs])

  useEffect(() => {
    if (userApplications.length > 0 && jobData) {
      checkAlreadyApplied()
    }
  }, [jobData, userApplications, id])

  if (!jobs.length || !jobData) {
    return <Loading />
  }

  const companyName = jobData.companyId?.name || jobData.company || 'Company'

  // Filter logic matching your screenshot layout
  const appliedJobsIds = new Set(userApplications.map(app => app.jobId && app.jobId._id))

  const relatedJobs = jobs
    .filter(job => job._id !== jobData._id && job.companyId?._id === jobData.companyId?._id)
    .filter(job => !appliedJobsIds.has(job._id))
    .slice(0, 4)

  const salary = Number(jobData.salary)

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-50 dark:bg-gray-950">
        {/* Job Header */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 pt-8 pb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center p-2">
                  <img
                    src={jobData.companyLogo || jobData.companyId?.image || assets.company_icon}
                    alt="Company Logo"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
                    {jobData.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
                    <span>{companyName}</span>
                    <span>|</span>
                    <span>{jobData.location || 'Location not specified'}</span>
                    <span>|</span>
                    <span>{jobData.level || 'Not specified'}</span>
                  </div>

                  {Number.isFinite(salary) && (
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400 mt-3">
                      CTC: ₹{salary.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                <button
                  onClick={applyHandler}
                  disabled={isAlreadyApplied}
                  type="button"
                  className={`${isAlreadyApplied ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white px-7 py-3 rounded-lg text-sm font-medium transition`}
                >
                  {isAlreadyApplied ? 'Already Applied' : 'Apply Now'}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Posted {jobData.date ? moment(jobData.date).fromNow() : 'recently'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Job Description and Related Jobs */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-7 items-start">
            
            {/* Job Description */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-8">
              <h2 className="font-bold text-2xl mb-4 text-gray-900 dark:text-white">Job description</h2>
              
              <div
                className="rich-text"
                dangerouslySetInnerHTML={{
                  __html: jobData.description || '<p>No description available.</p>'
                }}
              />

              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={applyHandler}
                  disabled={isAlreadyApplied}
                  type="button"
                  className={`${isAlreadyApplied ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} bg-blue-600 text-white p-2.5 px-10 rounded-lg text-sm font-medium transition`}
                >
                  {isAlreadyApplied ? 'Already Applied' : 'Apply Now'}
                </button>
              </div>
            </div>

            {/* Right Section More Jobs */}
            <div className="w-full lg:w-1/3 mt-8 lg:mt-0 lg:ml-8 space-y-5">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  More jobs from {companyName}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Other openings</p>

                <div className="flex flex-col gap-4">
                  {relatedJobs.length > 0 ? (
                    relatedJobs.map((job, index) => (
                      <JobCard key={job._id || index} job={job} />
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                      No related jobs available.
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

export default ApplyJob