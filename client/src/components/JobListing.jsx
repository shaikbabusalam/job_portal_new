import React, { useContext, useMemo, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { JobCategories, JobLocations } from '../assets/assets'
import JobCard from './JobCard'

const JobListing = () => {
  const {
    isSearched,
    searchFilter,
    setSearchFilter,
    setIsSearched,
    jobs
  } = useContext(AppContext)

  const [showFilter, setShowFilter] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedLocations, setSelectedLocations] = useState([])

  const jobsPerPage = 6

  // Toggle category selection
  const handleCategoryChange = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(item => item !== category)
        : [...prev, category]
    )
    setCurrentPage(1)
  }

  // Toggle location selection
  const handleLocationChange = (location) => {
    setSelectedLocations(prev =>
      prev.includes(location)
        ? prev.filter(item => item !== location)
        : [...prev, location]
    )
    setCurrentPage(1)
  }

  // Filter jobs
  const filteredJobs = useMemo(() => {
    const normalize = value => String(value ?? '').trim().toLowerCase()

    return [...(jobs || [])].reverse().filter(job => {
      const jobCategory = normalize(job.category)
      const jobLocation = normalize(job.location)
      const jobTitle = normalize(job.title)

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some(category =>
          jobCategory === normalize(category)
        )

      const matchesLocation =
        selectedLocations.length === 0 ||
        selectedLocations.some(location =>
          jobLocation.includes(normalize(location))
        )

      const matchesTitle =
        !normalize(searchFilter?.title) ||
        jobTitle.includes(normalize(searchFilter.title))

      const matchesSearchLocation =
        !normalize(searchFilter?.location) ||
        jobLocation.includes(normalize(searchFilter.location))

      return (
        matchesCategory &&
        matchesLocation &&
        matchesTitle &&
        matchesSearchLocation
      )
    })
  }, [jobs, selectedCategories, selectedLocations, searchFilter])

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage)
  const startIndex = (currentPage - 1) * jobsPerPage
  const displayedJobs = filteredJobs.slice(startIndex, startIndex + jobsPerPage)

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedLocations([])
    setSearchFilter({ title: '', location: '' })
    setIsSearched(false)
    setCurrentPage(1)
  }

  return (
    <section className="w-full min-h-screen bg-slate-50 dark:bg-[#030712] text-gray-900 dark:text-gray-100 py-10 transition-colors duration-300">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-7">

        {/* FILTER SIDEBAR */}
        <aside className="w-full lg:w-[280px] lg:shrink-0 h-fit bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <button
            onClick={() => setShowFilter(prev => !prev)}
            className="lg:hidden w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold mb-5"
          >
            {showFilter ? 'Close Filters' : 'Show Filters'}
          </button>

          <div className={`${showFilter ? 'block' : 'hidden'} lg:block`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear All
              </button>
            </div>

            {/* Current Search Tags */}
            {(searchFilter?.title || searchFilter?.location) && (
              <div className="mb-7">
                <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Current Search</h4>
                <div className="flex flex-wrap gap-2">
                  {searchFilter.title && (
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs">
                      {searchFilter.title}
                    </span>
                  )}
                  {searchFilter.location && (
                    <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg text-xs">
                      {searchFilter.location}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h4 className="font-bold text-lg mb-5 text-gray-900 dark:text-white">
                <span className="text-blue-500 mr-2">▦</span> Categories
              </h4>
              <ul className="space-y-4">
                {JobCategories.map((category, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      id={`category-${index}`}
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                    <label
                      htmlFor={`category-${index}`}
                      className="cursor-pointer text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {category}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Locations */}
            <div className="pt-6">
              <h4 className="font-bold text-lg mb-5 text-gray-900 dark:text-white">
                <span className="text-blue-500 mr-2">♦</span> Locations
              </h4>
              <ul className="space-y-4">
                {JobLocations.map((location, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      id={`location-${index}`}
                      checked={selectedLocations.includes(location)}
                      onChange={() => handleLocationChange(location)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                    <label
                      htmlFor={`location-${index}`}
                      className="cursor-pointer text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {location}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* JOB LISTING SECTION */}
        <div className="flex-1 min-w-0">
          <div className="mb-7">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">EXPLORE OPPORTUNITIES</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Latest Jobs</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Discover opportunities and take the next step in your career.</p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-4">
              Showing {filteredJobs.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + jobsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs
            </p>
          </div>

          {/* Job Cards Grid */}
          {displayedJobs.length > 0 ? (
            <div className="w-full min-w-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayedJobs.map((job, index) => (
                <JobCard key={job._id || index} job={job} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Jobs Found</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Try changing your search or selecting different filters.</p>
              <button
                onClick={clearFilters}
                className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-200"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-10 h-10 rounded-lg border font-semibold transition ${
                    currentPage === index + 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:border-blue-500'
                  }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-200"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default JobListing