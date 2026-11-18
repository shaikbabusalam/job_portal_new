// src/pages/Dashboard.jsx
import React, { useEffect, useContext } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const Dashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { companyData, setCompanyData, companyToken, setCompanyToken, backendUrl } = useContext(AppContext)

  const activeToken = companyToken || sessionStorage.getItem('companyToken')

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const { data } = await axios.get(backendUrl + '/api/company/company', {
          headers: { token: activeToken }
        })
        if (data.success && data.company) {
          setCompanyData(data.company)
        } else {
          handleLogout()
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message)
        handleLogout()
      }
    }

    if (activeToken && !companyData) {
      fetchCompanyData()
    }
  }, [activeToken, companyData])

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      end: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.8" />
          <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.8" />
          <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.8" />
          <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.8" />
        </svg>
      )
    },
    {
      name: 'Manage Jobs',
      path: '/dashboard/manage-jobs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="7" width="18" height="14" rx="2" strokeWidth="1.8" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" strokeWidth="1.8" />
        </svg>
      )
    },
    {
      name: 'Add Job',
      path: '/dashboard/add-job',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.8" />
          <path d="M12 8v8M8 12h8" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    },
    {
      name: 'View Applications',
      path: '/dashboard/view-applications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" strokeWidth="1.8" />
          <path d="M4 21a8 8 0 0 1 16 0" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    }
  ]

  const handleLogout = () => {
    setCompanyToken(null)
    setCompanyData(null)
    sessionStorage.removeItem('companyToken')
    navigate('/')
  }

  useEffect(() => {
    if (!activeToken) {
      navigate('/')
    }
  }, [activeToken, location.pathname])

  if (!activeToken) return null

  return (
    <div className="min-h-screen bg-white">
      <header className="h-[76px] border-b border-gray-200 flex items-center justify-between px-5 md:px-10 bg-white relative z-50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            J
          </div>

          <h1
            onClick={() => navigate('/')}
            className="text-2xl font-bold text-gray-900 max-sm:w-32 cursor-pointer"
          >
            Jobaora
          </h1>
        </div>

        {companyData && (
          <div className="flex items-center gap-3">
            <p className="max-sm:hidden text-gray-700 font-medium">Welcome, {companyData.name}</p>
            <div className="relative group">
              <img
                className="w-9 h-9 border border-gray-300 rounded-full object-cover cursor-pointer shadow-sm"
                src={companyData.image}
                alt="Company Logo"
              />
              <div className="absolute hidden group-hover:block top-0 right-0 z-10 pt-10">
                <ul className="list-none m-0 p-2 bg-white rounded-md border border-gray-200 text-sm shadow-lg">
                  <li
                    onClick={handleLogout}
                    className="py-1.5 px-3 cursor-pointer pr-8 text-red-600 hover:bg-red-50 rounded transition-colors font-medium"
                  >
                    Logout
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="flex min-h-[calc(100vh-76px)]">
        <aside className="w-[220px] shrink-0 border-r border-gray-200 bg-white hidden sm:block">
          <nav className="pt-5">
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-4 text-sm border-y border-transparent transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex justify-around py-3 shadow-lg">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-xs ${
                  isActive
                    ? 'text-indigo-600 font-semibold'
                    : 'text-gray-500'
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>

        <main className="flex-1 min-w-0 bg-slate-50 p-5 md:p-8 pb-24 sm:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Dashboard