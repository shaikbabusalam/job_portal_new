import React from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'

const JobCard = ({ job }) => {
  const navigate = useNavigate()

  const handleNavigate = () => {
    navigate(`/apply-job/${job._id}`)
    window.scrollTo(0, 0)
  }

  // Properly read name and image from nested companyId object
  const companyName = job.companyId?.name || job.company || 'Company Name'
  const companyLogo = job.companyId?.image || job.companyLogo || assets.company_icon

  const companyInitial = companyName.charAt(0).toUpperCase()

  const cleanDescription = (job.description || '')
    .replace(/<[^>]*>/g, '')
    .trim()

  const description = cleanDescription.length > 115
    ? `${cleanDescription.slice(0, 115)}...`
    : cleanDescription

  return (
    <article className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:border-blue-300 transition-all duration-300 flex flex-col h-full">

      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />

      {/* Company */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {companyLogo ? (
            <img
              src={job.companyId.image}
              alt={`${companyName} logo`}
              className="w-14 h-14 rounded-xl border border-slate-100 p-1 object-contain"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 text-blue-700 flex items-center justify-center text-2xl font-extrabold">
              {companyInitial}
            </div>
          )}

          <div className="min-w-0">
            <h4 className="font-bold text-slate-800 truncate">
              {companyName}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Company opportunity
            </p>
          </div>
        </div>

        <button
          onClick={handleNavigate}
          aria-label="View job details"
          className="shrink-0 w-9 h-9 rounded-full bg-slate-50 text-slate-500 hover:bg-blue-600 hover:text-white transition flex items-center justify-center"
        >
          ↗
        </button>
      </div>

      {/* Title */}
      <h3 className="text-xl font-extrabold text-slate-900 mt-7 leading-snug group-hover:text-blue-600 transition">
        {job.title || 'Job Title'}
      </h3>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mt-4">
        <span className="bg-blue-50 text-blue-700 rounded-lg px-3 py-2 text-xs font-semibold">
          📍 {job.location || 'Location not specified'}
        </span>

        {job.level && (
          <span className="bg-violet-50 text-violet-700 rounded-lg px-3 py-2 text-xs font-semibold">
            {job.level}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-slate-500 leading-6 mt-5 flex-grow">
        {description || 'Explore this opportunity to learn more about the role.'}
      </p>

      {/* Footer */}
      <div className="border-t border-slate-100 mt-6 pt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400 font-medium">
          Explore this role
        </span>

        <button
          onClick={handleNavigate}
          className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl px-5 py-2.5 text-sm font-bold shadow-md shadow-blue-100 hover:shadow-lg transition-all"
        >
          Apply Now →
        </button>
      </div>

    </article>
  )
}

export default JobCard