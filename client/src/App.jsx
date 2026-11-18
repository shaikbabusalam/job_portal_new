import React, { useContext, useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import axios from 'axios'

import Home from './pages/Home'
import ApplyJob from './pages/ApplyJob'
import Applications from './pages/Applications'
import ATSChecker from './pages/AtsChecker'
import ChatPage from './pages/ChatPage'

import Dashboard from './pages/Dashboard'
import AddJob from './pages/AddJob'
import ManageJobs from './pages/ManageJobs'
import ViewApplications from './pages/ViewApplications'

import RecruiterLogin from './components/RecruiterLogin'
import { AppContext } from './context/AppContext'
import 'quill/dist/quill.snow.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const DashboardOverview = () => {
  const { backendUrl, companyToken, companyData } = useContext(AppContext)
  const [stats, setStats] = useState({ jobs: 0, applicants: 0, accepted: 0, interviews: 0 })

  useEffect(() => {
    const loadStats = async () => {
      const token = companyToken || localStorage.getItem('companyToken')
      if (!token || !backendUrl) return
      try {
        const [jobsRes, appsRes, interviewsRes] = await Promise.all([
          axios.get(`${backendUrl}/api/company/list-jobs`, { headers: { token } }),
          axios.get(`${backendUrl}/api/company/applicants`, { headers: { token } }),
          axios.get(`${backendUrl}/api/company/interviews`, { headers: { token } })
        ])

        const jobsList = jobsRes.data.jobsData || []
        const appsList = appsRes.data.applications || []
        const interviewsList = interviewsRes.data.interviews || []

        setStats({
          jobs: jobsList.length,
          applicants: appsList.length,
          accepted: appsList.filter((a) => a.status?.trim().toLowerCase() === 'accepted').length,
          interviews: interviewsList.length
        })
      } catch (err) {
        console.error('Failed to load dashboard stats:', err)
      }
    }

    loadStats()
  }, [companyToken, backendUrl])

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          Recruiter Dashboard
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back{companyData?.name ? `, ${companyData.name}` : ''}. Here is your hiring overview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
          <p className="text-xs font-medium text-gray-500 uppercase">Active Jobs</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.jobs}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Applicants</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.applicants}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
          <p className="text-xs font-medium text-gray-500 uppercase">Accepted & Chatting</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.accepted}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
          <p className="text-xs font-medium text-gray-500 uppercase">Interviews Scheduled</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">{stats.interviews}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/dashboard/add-job"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
        >
          + Post New Job
        </Link>
        <Link
          to="/dashboard/view-applications"
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium transition"
        >
          Review Applicants
        </Link>
      </div>
    </div>
  )
}

const App = () => {
  const {
    showRecruiterLogin,
    setShowRecruiterLogin,
    companyToken
  } = useContext(AppContext)

  const hasRecruiterAccess = Boolean(companyToken || localStorage.getItem('companyToken'))

  return (
    <>
      {showRecruiterLogin && (
        <RecruiterLogin
          onClose={() => setShowRecruiterLogin(false)}
        />
      )}
      <ToastContainer />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/apply-job/:id" element={<ApplyJob />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/ats-checker" element={<ATSChecker />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:chatId" element={<ChatPage />} />

        {/* Recruiter Dashboard Layout */}
        <Route path="/dashboard" element={<Dashboard />}>
          {hasRecruiterAccess && (
            <>
              <Route path="add-job" element={<AddJob />} />
              <Route path="manage-jobs" element={<ManageJobs />} />
              <Route path="view-applications" element={<ViewApplications />} />
            </>
          )}

          <Route index element={<DashboardOverview />} />
        </Route>

        <Route
          path="*"
          element={
            <h1 className="p-10 text-center text-gray-600">
              404 - Page Not Found
            </h1>
          }
        />
      </Routes>
    </>
  )
}

export default App