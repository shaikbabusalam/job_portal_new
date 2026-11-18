import React, { useContext, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useClerk, UserButton, useUser, useAuth } from '@clerk/clerk-react'
import { useTheme } from '../context/ThemeContext'
import { AppContext } from '../context/AppContext'
import { SocketContext } from '../context/SocketContext'
import axios from 'axios'

const JobaoraLogo = () => {
  return (
    <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
      <svg
        width="38"
        height="38"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="sm:w-[43px] sm:h-[43px]"
      >
        <defs>
          <linearGradient id="jobaoraGradient" x1="5" y1="5" x2="43" y2="43">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
        </defs>

        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="14"
          fill="url(#jobaoraGradient)"
        />

        <path
          d="M28 11V29C28 34 25 37 20 37C17 37 14 36 12 34"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <path
          d="M23 23L28 28L38 17"
          stroke="#C4F1FF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex flex-col leading-none">
        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Jobaora<span className="text-indigo-600">.</span>
        </span>

        <span className="hidden xs:block sm:block mt-1 text-[8px] sm:text-[9px] font-semibold tracking-[2px] sm:tracking-[2.5px] uppercase text-gray-500 dark:text-gray-400">
          FIND YOUR FUTURE
        </span>
      </div>
    </Link>
  )
}

const Navbar = () => {
  const { openSignIn } = useClerk()
  const { isSignedIn, user } = useUser()
  const { getToken } = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const { socket } = useContext(SocketContext)
  const {
    setShowRecruiterLogin,
    userApplications,
    backendUrl,
    companyToken,
    companyData
  } = useContext(AppContext)
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userChats, setUserChats] = useState([])
  const [openingChat, setOpeningChat] = useState(false)

  const acceptedApplications = (userApplications || []).filter(
    (app) => app.jobId && app.status?.trim().toLowerCase() === 'accepted'
  )

  const fetchChats = async () => {
    if (!isSignedIn || !user?.id || !backendUrl) return
    try {
      const token = await getToken()
      if (!token) return
      const { data } = await axios.get(`${backendUrl}/api/chat/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setUserChats(data.chats || [])
      }
    } catch (err) {
      console.error('Failed to fetch user chats:', err)
    }
  }

  useEffect(() => {
    fetchChats()
  }, [isSignedIn, user?.id, backendUrl, acceptedApplications.length])

  useEffect(() => {
    if (!socket) return
    const handleNewMessage = () => fetchChats()
    socket.on('receive_message', handleNewMessage)
    return () => socket.off('receive_message', handleNewMessage)
  }, [socket, isSignedIn, user?.id])

  const totalUnread = userChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)

  const handleRecruiterClick = () => {
    setMobileMenuOpen(false)
    if (companyToken && companyData?._id) {
      navigate('/dashboard')
    } else {
      setShowRecruiterLogin(true)
    }
  }

  const handleOpenMessagesPage = async () => {
    setMobileMenuOpen(false)
    if (openingChat) return

    if (userChats.length > 0 && userChats[0]?._id) {
      navigate(`/chat/${userChats[0]._id}?role=applicant`)
      return
    }

    if (acceptedApplications.length > 0) {
      const firstApp = acceptedApplications[0]
      const jobId = firstApp.jobId?._id || firstApp.jobId
      const recruiterId =
        firstApp.companyId?._id || firstApp.companyId || firstApp.jobId?.companyId || ''

      try {
        setOpeningChat(true)
        const token = await getToken()
        const { data } = await axios.post(
          `${backendUrl}/api/chat/room`,
          {
            jobId,
            applicantId: user?.id,
            recruiterId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (data.success && data.chat?._id) {
          navigate(`/chat/${data.chat._id}?role=applicant`)
          return
        }
      } catch (err) {
        console.error('Failed to open chat room:', err)
      } finally {
        setOpeningChat(false)
      }
    }

    navigate('/chat?role=applicant')
  }

  return (
    <nav className="w-full bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16">
        <div className="h-16 sm:h-20 flex items-center justify-between gap-2">
          <JobaoraLogo />

          <div className="ml-auto flex items-center gap-2 sm:gap-5">
            <Link
              to="/ats-checker"
              className="hidden md:block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 whitespace-nowrap transition"
            >
              ATS Checker
            </Link>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
              className="p-2 rounded-full text-lg sm:text-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {isSignedIn ? (
              <>
                <Link
                  to="/applications"
                  className="hidden md:block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 whitespace-nowrap transition"
                >
                  Applied Jobs
                </Link>

                <button
                  onClick={handleOpenMessagesPage}
                  disabled={openingChat}
                  className="relative p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer disabled:opacity-50"
                  title="Open Hiring Messages"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>

                  {totalUnread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                      {totalUnread}
                    </span>
                  )}
                </button>

                <div className="hidden md:block h-7 w-px bg-gray-200 dark:bg-gray-700" />

                <span className="hidden lg:block text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  Hi, {user?.firstName || 'User'}
                </span>

                <UserButton />
              </>
            ) : (
              <>
                <button
                  onClick={handleRecruiterClick}
                  className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 whitespace-nowrap cursor-pointer"
                >
                  Recruiter Login
                </button>

                <button
                  onClick={() => openSignIn()}
                  className="bg-blue-600 text-white text-xs sm:text-sm font-medium px-3.5 sm:px-5 py-2 rounded-lg hover:bg-blue-700 transition whitespace-nowrap cursor-pointer"
                >
                  Login
                </button>
              </>
            )}

            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Open menu"
              className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-3 shadow-lg">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600"
          >
            Browse Jobs
          </Link>

          <Link
            to="/ats-checker"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600"
          >
            ATS Resume Checker
          </Link>

          {isSignedIn ? (
            <>
              <Link
                to="/applications"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600"
              >
                Applied Jobs ({acceptedApplications.length} Accepted)
              </Link>

              <button
                onClick={handleOpenMessagesPage}
                className="block w-full text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 cursor-pointer"
              >
                Hiring Messages {totalUnread > 0 ? `(${totalUnread} New)` : ''}
              </button>
            </>
          ) : (
            <button
              onClick={handleRecruiterClick}
              className="block w-full text-left py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer"
            >
              Recruiter Login
            </button>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar