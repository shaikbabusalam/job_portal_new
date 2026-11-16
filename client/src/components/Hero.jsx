
import React, { useContext, useRef } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'

const Hero = () => {
  const { setSearchFilter, setIsSearched } = useContext(AppContext)

  const titleRef = useRef(null)
  const locationRef = useRef(null)

  const onSearch = () => {
    setSearchFilter({
      title: titleRef.current.value.trim(),
      location: locationRef.current.value.trim()
    })

    setIsSearched(true)
  }

  return (
    <section className="w-full px-4 md:px-10 lg:px-16 xl:px-20 mx-auto py-10 bg-slate-50 dark:bg-gray-950 transition-colors duration-300">

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-800 via-purple-900 to-indigo-950 text-white py-14 md:py-20 px-5 md:px-10 text-center rounded-2xl shadow-xl">

        <div className="relative z-10 max-w-5xl mx-auto">

          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-5">
            Over 10,000+ Jobs to Apply
          </h2>

          <p className="text-sm md:text-base lg:text-lg text-purple-100 mb-9 leading-relaxed">
            Your Next Big Career Move Starts Right Here - Explore the Best Job
            Opportunities and Take the First Step Toward Your Future!
          </p>

          {/* Search Form */}
          <div className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 rounded-xl p-2 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-2 shadow-lg">

            {/* Job Search */}
            <div className="flex items-center px-3 w-full md:w-5/12 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">

              <img
                src={assets.search_icon}
                alt="Search"
                className="w-5 h-5 mr-3 opacity-70"
              />

              <input
                type="text"
                placeholder="Search for jobs"
                className="w-full p-3 text-sm outline-none bg-transparent text-gray-800 dark:text-white placeholder-gray-400"
                ref={titleRef}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              />
            </div>

            {/* Location Search */}
            <div className="flex items-center px-3 w-full md:w-5/12">

              <img
                src={assets.location_icon}
                alt="Location"
                className="w-5 h-5 mr-3 opacity-70"
              />

              <input
                type="text"
                placeholder="Enter location"
                className="w-full p-3 text-sm outline-none bg-transparent text-gray-800 dark:text-white placeholder-gray-400"
                ref={locationRef}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              />
            </div>

            {/* Search Button */}
            <button
              onClick={onSearch}
              className="w-full md:w-2/12 bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-800 active:scale-95 transition-all duration-200"
            >
              Search
            </button>

          </div>
        </div>
      </div>

      {/* Trusted Companies */}
      <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm mx-1 md:mx-2 mt-6 p-5 md:p-6 rounded-xl transition-colors duration-300">

        <div className="flex items-center justify-center gap-8 lg:gap-14 flex-wrap">

          <p className="font-semibold text-gray-700 dark:text-gray-200">
            Trusted by
          </p>

          <img
            className="h-6 object-contain"
            src={assets.microsoft_logo}
            alt="Microsoft"
          />

          <img
            className="h-6 object-contain"
            src={assets.walmart_logo}
            alt="Walmart"
          />

          <img
            className="h-6 object-contain"
            src={assets.accenture_logo}
            alt="Accenture"
          />

          <img
            className="h-6 object-contain"
            src={assets.samsung_logo}
            alt="Samsung"
          />

          <img
            className="h-6 object-contain"
            src={assets.amazon_logo}
            alt="Amazon"
          />

          <img
            className="h-6 object-contain"
            src={assets.adobe_logo}
            alt="Adobe"
          />

        </div>
      </div>

    </section>
  )
}

export default Hero
