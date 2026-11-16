import React, { useEffect, useState, useContext } from 'react'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const ManageJobs = () => {
  const navigate = useNavigate()
  const { backendUrl, companyToken } = useContext(AppContext)
  const [jobs, setJobs] = useState([])

  // Fetch jobs posted by the company from backend
  const fetchCompanyJobs = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/company/list-jobs', {
        headers: { token: companyToken }
      })

      if (data.success) {
        const jobList = data.jobsData || data.jobs || data.data || (Array.isArray(data) ? data : [])
        setJobs(jobList.slice().reverse())
      } else {
        toast.error(data.message || 'Failed to fetch jobs')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  useEffect(() => {
    if (companyToken) {
      fetchCompanyJobs()
    }
  }, [companyToken])

  // Add Job
  const handleAddJob = () => {
    navigate('/dashboard/add-job')
  }

  // Function to change Job Visibility with Console Debugging
  const changeJobVisibility = async (id) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/company/change-visibility',
        { id },
        { headers: { token: companyToken } }
      )

      // DEBUG: Check your browser console (F12) to verify visibility toggle response
      console.log("Visibility Toggle Response:", data)

      if (data.success) {
        toast.success(data.message || 'Job visibility updated successfully')
        fetchCompanyJobs() // Re-fetch list to update UI state
      } else {
        toast.error(data.message || 'Failed to update visibility')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  // Delete Job
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        const { data } = await axios.post(
          backendUrl + '/api/company/delete-job',
          { id },
          { headers: { token: companyToken } }
        )

        if (data.success) {
          toast.success(data.message || 'Job deleted successfully')
          fetchCompanyJobs()
        } else {
          toast.error(data.message)
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message)
      }
    }
  }

  // Edit Job
  const handleEdit = (job) => {
    navigate('/dashboard/add-job', {
      state: { job }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            Manage Jobs
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Manage, edit and track all your job postings.
          </p>
        </div>

        <button
          onClick={handleAddJob}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <span className="text-xl">+</span>
          Add New Job
        </button>
      </div>

      {/* Job Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 md:px-7 py-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            All Job Listings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {jobs.length} job postings available
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Job Title</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Applications</th>
                <th className="px-6 py-4">Visibility</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {jobs.map((job, index) => (
                <tr
                  key={job._id || job.id || index}
                  className="hover:bg-blue-50/40 transition-colors"
                >
                  <td className="px-6 py-5 text-sm text-slate-400">
                    {index + 1}
                  </td>

                  <td className="px-6 py-5">
                    <p className="font-semibold text-slate-800 text-sm">
                      {job.title}
                    </p>
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-500">
                    {job.date ? moment(job.date).format('ll') : '-'}
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-600">
                    {job.location || '-'}
                  </td>

                  <td className="px-6 py-5">
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold">
                      {job.applicants || 0}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!job.visible}
                        onClick={() => changeJobVisibility(job._id || job.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          job.visible ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            job.visible ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>

                      <span className={`text-xs font-medium ${
                        job.visible ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        {job.visible ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5 text-center">
                    <div className="relative group inline-block">
                      <button
                        type="button"
                        className="w-9 h-9 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 text-xl"
                      >
                        ⋮
                      </button>

                      <div className="hidden group-hover:flex group-focus-within:flex flex-col absolute right-0 top-full mt-1 bg-white shadow-xl border border-slate-100 rounded-xl z-20 w-32 overflow-hidden">
                        <button
                          onClick={() => handleEdit(job)}
                          className="px-4 py-3 text-sm text-left text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(job._id || job.id)}
                          className="px-4 py-3 text-sm text-left text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {jobs.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <p className="text-slate-700 font-semibold">
                      No jobs available
                    </p>
                    <button
                      onClick={handleAddJob}
                      className="mt-3 text-blue-600 font-semibold text-sm hover:underline"
                    >
                      + Add your first job
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Synced with database server.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ManageJobs