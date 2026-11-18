import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const formatSalary = (amount) => {
  const num = Number(amount)
  if (!num || Number.isNaN(num)) return amount
  if (num >= 100000) return `₹${(num / 100000).toFixed(0)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`
  return `₹${num}`
}

const JobCard = ({ job }) => {
  const navigate = useNavigate()
  const [bookmarked, setBookmarked] = useState(false)

  const companyName = job?.companyId?.name || 'Company'
  const companyImage = job?.companyId?.image || assets.company_icon

  return (
    <div className='bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group'>
      <div>
        <div className='flex items-center justify-between gap-3 mb-5'>
          <img
            src={companyImage}
            alt={companyName}
            className='w-12 h-12 object-contain rounded-2xl border border-zinc-100 dark:border-zinc-800 p-1.5 bg-zinc-50 dark:bg-zinc-800 shrink-0'
          />

          <button
            onClick={() => setBookmarked((prev) => !prev)}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark job'}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
              bookmarked
                ? 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-950 dark:border-violet-800 dark:text-violet-300'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white'
            }`}
          >
            {bookmarked ? '★' : '☆'}
          </button>
        </div>

        <h3 className='font-bold text-base sm:text-lg text-zinc-900 dark:text-white group-hover:text-violet-600 transition truncate'>
          {job.title}
        </h3>

        <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate font-medium'>
          {companyName} • {job.location}
        </p>

        <p
          className='text-xs text-zinc-600 dark:text-zinc-300 mt-3.5 line-clamp-2 leading-relaxed'
          dangerouslySetInnerHTML={{ __html: job.description.slice(0, 110) + '...' }}
        />

        <div className='flex flex-wrap items-center gap-2 mt-5'>
          <span className='px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold'>
            {job.level}
          </span>
          <span className='px-3 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-[11px] font-semibold'>
            CTC: {formatSalary(job.salary)}
          </span>
        </div>
      </div>

      <div className='flex items-center gap-2.5 pt-5 mt-5 border-t border-zinc-100 dark:border-zinc-800'>
        <button
          onClick={() => {
            navigate(`/apply-job/${job._id}`)
            window.scrollTo(0, 0)
          }}
          className='flex-1 bg-zinc-900 hover:bg-violet-600 dark:bg-white dark:hover:bg-violet-600 dark:text-zinc-900 text-white py-3 rounded-xl text-xs font-bold transition cursor-pointer text-center shadow-md'
        >
          Apply Now
        </button>

        <button
          onClick={() => {
            navigate(`/apply-job/${job._id}`)
            window.scrollTo(0, 0)
          }}
          className='px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer'
        >
          Details
        </button>
      </div>
    </div>
  )
}

export default JobCard