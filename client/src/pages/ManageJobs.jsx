import React, { useContext, useEffect, useState } from 'react'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const ManageJobs = () => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState(false)
  const { backendUrl, companyToken } = useContext(AppContext)

  const token = companyToken || sessionStorage.getItem('companyToken')

  const fetchCompanyJobs = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/company/list-jobs', {
        headers: { token }
      })
      if (data.success) {
        setJobs(data.jobsData.reverse())
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const changeJobVisiblity = async (id) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/company/change-visibility',
        { id },
        { headers: { token } }
      )
      if (data.success) {
        toast.success(data.message)
        fetchCompanyJobs()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const handleDeleteJob = async (id) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/company/delete-job',
        { id },
        { headers: { token } }
      )
      if (data.success) {
        toast.success(data.message || 'Job deleted')
        setJobs((prev) => prev.filter((item) => item._id !== id))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  useEffect(() => {
    if (token) {
      fetchCompanyJobs()
    }
  }, [token])

  return jobs ? (
    jobs.length === 0 ? (
      <div className='flex items-center justify-center h-[70vh]'>
        <p className='text-xl sm:text-2xl text-zinc-500'>No Jobs Available or posted</p>
      </div>
    ) : (
      <div className='container p-2 sm:p-4 max-w-6xl mx-auto'>
        <div className='mb-6'>
          <h2 className='text-xl sm:text-2xl font-black text-zinc-900 dark:text-white'>Manage Jobs</h2>
          <p className='text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
            Toggle job visibility, view applicants, or remove postings. Use the scrollbar below to view all columns.
          </p>
        </div>

        {/* Visible Horizontal Scroller */}
        <div className='w-full table-scroll-x bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm pb-1'>
          <table className='w-full min-w-[860px] text-sm'>
            <thead className='bg-zinc-50 dark:bg-zinc-950/60'>
              <tr className='border-b border-zinc-200 dark:border-zinc-800'>
                <th className='py-4 px-5 text-left font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap'>#</th>
                <th className='py-4 px-5 text-left font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap'>Job Title</th>
                <th className='py-4 px-5 text-left font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap'>Date</th>
                <th className='py-4 px-5 text-left font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap'>Location</th>
                <th className='py-4 px-5 text-center font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap'>Applicants</th>
                <th className='py-4 px-5 text-center font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap'>Visible</th>
                <th className='py-4 px-5 text-center font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap'>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => (
                <tr key={job._id || index} className='text-zinc-700 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition'>
                  <td className='py-4 px-5 whitespace-nowrap'>{index + 1}</td>
                  <td className='py-4 px-5 font-semibold text-zinc-900 dark:text-white whitespace-nowrap'>{job.title}</td>
                  <td className='py-4 px-5 text-zinc-500 whitespace-nowrap'>{moment(job.date).format('ll')}</td>
                  <td className='py-4 px-5 text-zinc-500 whitespace-nowrap'>{job.location}</td>
                  <td className='py-4 px-5 text-center whitespace-nowrap'>
                    <span className='inline-block bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-semibold px-3 py-1 rounded-full text-xs'>
                      {job.applicants}
                    </span>
                  </td>
                  <td className='py-4 px-5 text-center whitespace-nowrap'>
                    <input
                      onChange={() => changeJobVisiblity(job._id)}
                      className='scale-125 accent-violet-600 cursor-pointer'
                      type='checkbox'
                      checked={job.visible}
                    />
                  </td>
                  <td className='py-4 px-5 text-center whitespace-nowrap'>
                    <div className='inline-flex items-center gap-2'>
                      <button
                        onClick={() => navigate('/dashboard/view-applications')}
                        className='bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap'
                      >
                        Applicants
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job._id)}
                        className='bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap'
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='mt-6 flex justify-end'>
          <button
            onClick={() => navigate('/dashboard/add-job')}
            className='bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3 px-6 rounded-2xl text-xs sm:text-sm font-bold transition shadow-md cursor-pointer'
          >
            + Add new job
          </button>
        </div>
      </div>
    )
  ) : (
    <Loading />
  )
}

export default ManageJobs