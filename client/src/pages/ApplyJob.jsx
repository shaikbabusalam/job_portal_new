import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { AppContext } from '../context/AppContext'
import Loading from '../components/Loading'
import Navbar from '../components/Navbar'
import { assets } from '../assets/assets'
import moment from 'moment'
import JobCard from '../components/JobCard'
import Footer from '../components/Footer'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth, useClerk } from '@clerk/clerk-react'

const formatSalary = (amount) => {
  const num = Number(amount)
  if (!num || Number.isNaN(num)) return amount
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return num.toString()
}

const ApplyJob = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getToken, isSignedIn } = useAuth()
  const { openSignIn } = useClerk()

  const [jobData, setJobData] = useState(null)
  const [isAlreadyApplied, setIsAlreadyApplied] = useState(false)
  const [applying, setApplying] = useState(false)

  const {
    jobs,
    backendUrl,
    userData,
    userApplications,
    fetchUserApplications,
    fetchUserData
  } = useContext(AppContext)

  const fetchJob = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/jobs/${id}`)

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
      if (!isSignedIn) {
        openSignIn()
        return
      }

      let activeUser = userData
      if (!activeUser) {
        await fetchUserData()
        activeUser = userData
      }

      if (!activeUser?.resume) {
        navigate('/applications')
        toast.error('Upload resume to apply')
        return
      }

      setApplying(true)
      const token = await getToken()

      const { data } = await axios.post(
        `${backendUrl}/api/users/apply`,
        { jobId: jobData._id },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (data.success) {
        toast.success(data.message)
        setIsAlreadyApplied(true)
        fetchUserApplications()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setApplying(false)
    }
  }

  const checkAlreadyApplied = () => {
    if (!jobData) return
    const hasApplied = (userApplications || []).some(
      (item) => (item.jobId?._id || item.jobId) === jobData._id
    )
    setIsAlreadyApplied(hasApplied)
  }

  useEffect(() => {
    fetchJob()
  }, [id])

  useEffect(() => {
    if ((userApplications || []).length > 0 && jobData) {
      checkAlreadyApplied()
    }
  }, [jobData, userApplications, id])

  if (!jobData) {
    return <Loading />
  }

  const companyName = jobData?.companyId?.name || 'Company'
  const companyImage = jobData?.companyId?.image || assets.company_icon
  const sanitizedDescription = DOMPurify.sanitize(jobData.description || '')

  const relatedJobs = (jobs || [])
    .filter(
      (job) =>
        job._id !== jobData._id &&
        job.companyId?._id === jobData.companyId?._id
    )
    .filter((job) => {
      const appliedJobsIds = new Set(
        (userApplications || []).map((app) => app.jobId && app.jobId._id)
      )
      return !appliedJobsIds.has(job._id)
    })
    .slice(0, 4)

  return (
    <>
      <Navbar />

      <div className="min-h-screen flex flex-col py-6 sm:py-10 container px-4 2xl:px-20 mx-auto">
        <div className="bg-white dark:bg-gray-900 text-black dark:text-white rounded-lg w-full">

          {/* Job Header */}
          <div className="flex justify-center md:justify-between flex-wrap gap-6 sm:gap-8 px-5 sm:px-10 md:px-14 py-10 sm:py-16 md:py-20 mb-6 bg-sky-50 dark:bg-gray-800 border border-sky-400 dark:border-gray-700 rounded-xl">

            <div className="flex flex-col md:flex-row items-center">
              <img
                className="h-20 w-20 sm:h-24 sm:w-24 bg-white rounded-lg p-3 sm:p-4 md:mr-4 max-md:mb-4 border object-contain"
                src={companyImage}
                alt={companyName}
              />

              <div className="text-center md:text-left text-neutral-700 dark:text-gray-200">
                <h1 className="text-xl sm:text-3xl md:text-4xl font-medium">
                  {jobData.title}
                </h1>

                <div className="flex flex-row flex-wrap max-md:justify-center gap-y-2 gap-4 sm:gap-6 items-center text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300 mt-3">
                  <span className="flex items-center gap-1.5">
                    <img src={assets.suitcase_icon} alt="" className="w-4 h-4" />
                    {companyName}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <img src={assets.location_icon} alt="" className="w-4 h-4" />
                    {jobData.location}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <img src={assets.person_icon} alt="" className="w-4 h-4" />
                    {jobData.level}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <img src={assets.money_icon} alt="" className="w-4 h-4" />
                    CTC: {formatSalary(jobData.salary)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center text-end text-sm w-full md:w-auto max-md:text-center">
              <button
                onClick={applyHandler}
                disabled={isAlreadyApplied || applying}
                className={`w-full md:w-auto p-3 px-10 text-white font-medium rounded-lg transition cursor-pointer ${
                  isAlreadyApplied
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {isAlreadyApplied ? 'Already Applied' : applying ? 'Applying...' : 'Apply Now'}
              </button>

              <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Posted {moment(jobData.date).fromNow()}
              </p>
            </div>
          </div>

          {/* Job Content */}
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 sm:gap-10">

            {/* Left Column */}
            <div className="w-full lg:w-2/3">
              <h2 className="font-bold text-xl sm:text-2xl mb-4">
                Job Description
              </h2>

              <div
                className="rich-text text-sm sm:text-base dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />

              <button
                onClick={applyHandler}
                disabled={isAlreadyApplied || applying}
                className={`w-full sm:w-auto p-3 px-10 text-white font-medium rounded-lg mt-8 sm:mt-10 transition cursor-pointer ${
                  isAlreadyApplied
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {isAlreadyApplied ? 'Already Applied' : applying ? 'Applying...' : 'Apply Now'}
              </button>
            </div>

            {/* Right Column */}
            <div className="w-full lg:w-1/3 mt-6 lg:mt-0 lg:ml-8 space-y-5">
              <h2 className="font-semibold text-lg sm:text-xl">
                More jobs from {companyName}
              </h2>

              {relatedJobs.length > 0 ? (
                relatedJobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No other jobs from this company.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default ApplyJob