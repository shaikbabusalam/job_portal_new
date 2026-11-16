import React, { useContext } from 'react'
import { Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import ApplyJob from './pages/ApplyJob'
import Applications from './pages/Applications'
import ATSChecker from './pages/AtsChecker'

import Dashboard from './pages/Dashboard'
import AddJob from './pages/AddJob'
import ManageJobs from './pages/ManageJobs'
import ViewApplications from './pages/ViewApplications'

import RecruiterLogin from './components/RecruiterLogin'
import { AppContext } from './context/AppContext'
import 'quill/dist/quill.snow.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const App = () => {
  const {
    showRecruiterLogin,
    setShowRecruiterLogin,
    companyToken
  } = useContext(AppContext)

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

        {/* Recruiter Dashboard Layout */}
        <Route path="/dashboard" element={<Dashboard />}>
          {companyToken && (
            <>
              <Route path="add-job" element={<AddJob />} />
              <Route path="manage-jobs" element={<ManageJobs />} />
              <Route path="view-applications" element={<ViewApplications />} />
            </>
          )}

          <Route
            index
            element={
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  Recruiter Dashboard
                </h2>
                <p className="text-gray-500 mt-2">
                  Welcome to your recruiter workspace.
                </p>
              </div>
            }
          />
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