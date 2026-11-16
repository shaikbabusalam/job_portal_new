
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'

// Jobaora Logo
const JobaoraLogo = () => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <svg
          width="42"
          height="42"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="footerJobaoraGradient" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>

          <rect
            width="64"
            height="64"
            rx="17"
            fill="url(#footerJobaoraGradient)"
          />

          <path
            d="M37 12V38C37 47 32 52 23 52C18 52 14 50 11 47"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <path
            d="M29 31L37 39L53 21"
            stroke="#C4F1FF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="text-2xl font-bold tracking-tight text-gray-900">
          Jobaora<span className="text-blue-600">.</span>
        </span>
      </div>

      <span className="text-[9px] font-semibold tracking-[2.5px] text-gray-500 ml-[50px] mt-1">
        FIND YOUR FUTURE
      </span>
    </div>
  )
}

const Footer = () => {
  const [activeSection, setActiveSection] = useState(null)

  const { openSignIn, openSignUp } = useClerk()

  const toggleSection = (section) => {
    setActiveSection(
      activeSection === section ? null : section
    )
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const sections = [
    {
      title: 'Quick Links',
      links: [
        { name: 'Home', path: '/' },
        { name: 'Browse Jobs', path: '/' },
        { name: 'Applied Jobs', path: '/applications' }
      ]
    },
    {
      title: 'For Job Seekers',
      links: [
        { name: 'Find Jobs', path: '/' },
        { name: 'My Applications', path: '/applications' }
      ]
    },
    {
      title: 'For Recruiters',
      links: [
        {
          name: 'Recruiter Login',
          action: () => openSignIn()
        },
        {
          name: 'Recruiter Sign Up',
          action: () => openSignUp()
        },
        {
          name: 'Post a Job',
          action: () => openSignIn()
        }
      ]
    }
  ]

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-20">

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Logo & Description */}
          <div>

            <Link to="/" onClick={scrollToTop}>
              <JobaoraLogo />
            </Link>

            <p className="text-gray-500 text-sm leading-6 mt-5">
              Discover opportunities, connect with top companies
              and take the next step in your career with Jobaora.
            </p>

            {/* Social Media */}
            <div className="flex gap-3 mt-5">

              <a
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300"
              >
                in
              </a>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border hover:bg-pink-600 hover:text-white hover:border-pink-600 transition-all duration-300"
              >
                IG
              </a>

              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-all duration-300"
              >
                f
              </a>

            </div>
          </div>

          {/* Navigation Sections */}
          {sections.map((section) => (
            <div key={section.title}>

              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex justify-between items-center text-left font-semibold text-gray-900 mb-5"
                aria-expanded={activeSection === section.title}
              >
                {section.title}

                <span className="lg:hidden text-blue-600 text-xl">
                  {activeSection === section.title ? '−' : '+'}
                </span>
              </button>

              <ul
                className={`space-y-3 text-sm text-gray-500 ${
                  activeSection === section.title ? 'block' : 'hidden'
                } lg:block`}
              >

                {section.links.map((link) => (
                  <li key={link.name}>

                    {link.path ? (
                      <Link
                        to={link.path}
                        onClick={scrollToTop}
                        className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all duration-200"
                      >
                        {link.name}
                      </Link>
                    ) : (
                      <button
                        onClick={link.action}
                        className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all duration-200"
                      >
                        {link.name}
                      </button>
                    )}

                  </li>
                ))}

              </ul>
            </div>
          ))}

        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-5">

          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              Have questions?
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Get in touch with our support team.
            </p>
          </div>

          <a
            href="mailto:support@jobaora.com"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 hover:shadow-lg transition-all duration-300"
          >
            Contact Us →
          </a>

        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-5">

          <p className="text-gray-500 text-sm text-center">
            © {new Date().getFullYear()} Jobaora.
            All rights reserved.
          </p>

          <div className="flex gap-5 text-sm text-gray-500">

            <Link
              to="/privacy"
              onClick={scrollToTop}
              className="hover:text-blue-600 transition"
            >
              Privacy Policy
            </Link>

            <Link
              to="/terms"
              onClick={scrollToTop}
              className="hover:text-blue-600 transition"
            >
              Terms & Conditions
            </Link>

          </div>

          {/* Back To Top */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:-translate-y-1 transition-all duration-300"
          >
            Back to Top ↑
          </button>

        </div>

      </div>
    </footer>
  )
}

export default Footer
