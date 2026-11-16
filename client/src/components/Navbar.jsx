import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { useTheme } from '../context/ThemeContext'
import { AppContext } from '../context/AppContext'

const JobaoraLogo = () => {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0 group">

      {/* Custom Jobaora Icon */}
      <svg
        width="43"
        height="43"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
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

      {/* Company Name */}
      <div className="flex flex-col leading-none">
        <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Jobaora<span className="text-indigo-600">.</span>
        </span>

        <span className="mt-1 text-[9px] font-semibold tracking-[2.5px] uppercase text-gray-500 dark:text-gray-400">
          FIND YOUR FUTURE
        </span>
      </div>
    </Link>
  )
}

const Navbar = () => {
  const { openSignIn } = useClerk()
  const { isSignedIn, user } = useUser()
  const { darkMode, toggleTheme } = useTheme()
  const { setShowRecruiterLogin } = useContext(AppContext)

  return (
    <nav className="w-full bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-700">

      <div className="w-full px-5 sm:px-8 md:px-12 lg:px-16">

        <div className="h-20 flex items-center justify-between">

          {/* Jobaora Logo - Far Left */}
          <JobaoraLogo />

          {/* Navigation - Far Right */}
          <div className="ml-auto flex items-center gap-3 sm:gap-5">

            <Link
              to="/ats-checker"
              className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 whitespace-nowrap transition"
            >
              ATS Checker
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
              className="text-xl cursor-pointer"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {isSignedIn ? (
              <>
                <Link
                  to="/applications"
                  className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 whitespace-nowrap transition"
                >
                  Applied Jobs
                </Link>

                <div className="h-7 w-px bg-gray-200 dark:bg-gray-700" />

                <span className="hidden md:block text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  Hi, {user?.firstName || 'User'}
                </span>

                <UserButton />
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowRecruiterLogin(true)}
                  className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 whitespace-nowrap"
                >
                  Recruiter Login
                </button>

                <button
                  onClick={() => openSignIn()}
                  className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-blue-700 transition whitespace-nowrap"
                >
                  Login
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
