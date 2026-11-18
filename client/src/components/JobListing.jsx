import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { JobCategories, JobLocations } from '../assets/assets'
import JobCard from './JobCard'

const JobListing = () => {
  const { isSearched, searchFilter, setSearchFilter, jobs } = useContext(AppContext)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')

  const filteredJobs = jobs.filter((job) => {
    const matchesTitle = searchFilter.title === '' || job.title.toLowerCase().includes(searchFilter.title.toLowerCase())
    const matchesLocation = searchFilter.location === '' || job.location.toLowerCase().includes(searchFilter.location.toLowerCase())
    const matchesCategory = selectedCategory === '' || job.category === selectedCategory
    const matchesLocDropdown = selectedLocation === '' || job.location === selectedLocation
    const matchesLevel = selectedLevel === '' || job.level === selectedLevel

    return matchesTitle && matchesLocation && matchesCategory && matchesLocDropdown && matchesLevel && job.visible
  })

  const resetFilters = () => {
    setSelectedCategory('')
    setSelectedLocation('')
    setSelectedLevel('')
    setSearchFilter({ title: '', location: '' })
  }

  return (
    <div className='container 2xl:px-20 mx-auto px-4 my-10'>
      {/* Horizontal Filter Bar */}
      <div className='bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm mb-8'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-wrap items-center gap-3 flex-1'>
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className='bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 rounded-xl px-4 py-3 outline-none cursor-pointer font-medium'
            >
              <option value=''>All Categories</option>
              {JobCategories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Location Dropdown */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className='bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 rounded-xl px-4 py-3 outline-none cursor-pointer font-medium'
            >
              <option value=''>All Locations</option>
              {JobLocations.map((loc, idx) => (
                <option key={idx} value={loc}>{loc}</option>
              ))}
            </select>

            {/* Experience Level Dropdown */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className='bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 rounded-xl px-4 py-3 outline-none cursor-pointer font-medium'
            >
              <option value=''>All Experience Levels</option>
              <option value='Beginner level'>Beginner level</option>
              <option value='Intermediate level'>Intermediate level</option>
              <option value='Senior level'>Senior level</option>
            </select>
          </div>

          {(selectedCategory || selectedLocation || selectedLevel || searchFilter.title || searchFilter.location) && (
            <button
              onClick={resetFilters}
              className='text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-3 py-2 cursor-pointer'
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Active Search Badge */}
      {isSearched && (searchFilter.title !== '' || searchFilter.location !== '') && (
        <div className='flex items-center gap-2 mb-6'>
          <span className='text-xs font-medium text-zinc-500'>Active Search:</span>
          {searchFilter.title && (
            <span className='inline-flex items-center gap-1.5 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-semibold px-3 py-1 rounded-full'>
              {searchFilter.title}
              <button onClick={() => setSearchFilter((prev) => ({ ...prev, title: '' }))} className='hover:opacity-70'>×</button>
            </span>
          )}
          {searchFilter.location && (
            <span className='inline-flex items-center gap-1.5 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-semibold px-3 py-1 rounded-full'>
              {searchFilter.location}
              <button onClick={() => setSearchFilter((prev) => ({ ...prev, location: '' }))} className='hover:opacity-70'>×</button>
            </span>
          )}
          <button
            onClick={() => setSearchFilter({ title: '', location: '' })}
            className='text-xs text-zinc-400 hover:underline ml-2 cursor-pointer'
          >
            Clear all
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight' id='job-list'>
          Recent Job Openings
        </h2>
        <span className='text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400'>
          Showing {filteredJobs.slice((currentPage - 1) * 6, currentPage * 6).length} of {filteredJobs.length} jobs
        </span>
      </div>

      {/* 3-Column Job Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredJobs.slice((currentPage - 1) * 6, currentPage * 6).map((job, index) => (
          <JobCard key={job._id || index} job={job} />
        ))}
      </div>

      {/* Pagination */}
      {filteredJobs.length > 6 && (
        <div className='flex items-center justify-center space-x-2 mt-12'>
          <a href='#job-list'>
            <button
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              className='w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center disabled:opacity-40 cursor-pointer font-bold'
            >
              ←
            </button>
          </a>
          {Array.from({ length: Math.ceil(filteredJobs.length / 6) }).map((_, index) => (
            <a key={index} href='#job-list'>
              <button
                onClick={() => setCurrentPage(index + 1)}
                className={`w-10 h-10 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  currentPage === index + 1
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                }`}
              >
                {index + 1}
              </button>
            </a>
          ))}
          <a href='#job-list'>
            <button
              onClick={() => setCurrentPage(Math.min(currentPage + 1, Math.ceil(filteredJobs.length / 6)))}
              disabled={currentPage === Math.ceil(filteredJobs.length / 6)}
              className='w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center disabled:opacity-40 cursor-pointer font-bold'
            >
              →
            </button>
          </a>
        </div>
      )}
    </div>
  )
}

export default JobListing