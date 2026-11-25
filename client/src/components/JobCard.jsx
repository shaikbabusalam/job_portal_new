// src/components/JobCard.jsx
import React, { useState } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';

const formatCtcBadge = (amount) => {
  if (amount === undefined || amount === null || amount === '') return 'Competitive CTC';
  const rawStr = String(amount).trim();
  const numericOnly = Number(rawStr.replace(/[,₹$\s]/g, ''));

  if (!Number.isNaN(numericOnly) && numericOnly > 0) {
    if (numericOnly >= 100000) {
      const lpa = (numericOnly / 100000).toFixed(1).replace(/\.0$/, '');
      return `₹${lpa} LPA`;
    }
    if (numericOnly >= 1000) {
      const k = (numericOnly / 1000).toFixed(1).replace(/\.0$/, '');
      return `₹${k}K`;
    }
    return `₹${numericOnly}`;
  }
  return rawStr;
};

const stripHtmlToWordLimit = (html = '', maxChars = 110) => {
  const clean = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const sliced = clean.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
};

const JobCard = ({ job }) => {
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(false);

  const companyName = job?.companyId?.name || 'Company';
  const companyImage = job?.companyId?.image || assets.company_icon;
  const summary = stripHtmlToWordLimit(job?.description || '', 110);

  const openJob = () => {
    navigate(`/apply-job/${job._id}`);
    window.scrollTo(0, 0);
  };

  return (
    <article className='bg-[#0b1220] border border-slate-800/90 rounded-3xl p-6 shadow-sm hover:border-violet-500/50 hover:shadow-xl transition-all duration-200 flex flex-col justify-between group'>
      <div>
        <div className='flex items-start justify-between gap-3 mb-4'>
          <img
            src={companyImage}
            alt={companyName}
            className='w-12 h-12 object-contain rounded-2xl border border-slate-800 p-1.5 bg-white shrink-0'
          />

          <button
            type='button'
            onClick={() => setBookmarked((prev) => !prev)}
            title={bookmarked ? 'Saved job' : 'Save job'}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark job'}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0 ${
              bookmarked
                ? 'bg-violet-500/20 border-violet-400/50 text-violet-300'
                : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'
            }`}
          >
            {bookmarked ? '★' : '☆'}
          </button>
        </div>

        <h3
          onClick={openJob}
          className='font-bold text-lg text-violet-400 group-hover:text-violet-300 transition cursor-pointer line-clamp-1'
        >
          {job.title}
        </h3>

        <p className='text-xs text-slate-400 mt-1 truncate font-medium'>
          {companyName} • {job.location || 'Remote'}
        </p>

        {summary && (
          <p className='text-xs text-slate-300/90 mt-3.5 line-clamp-2 leading-relaxed'>
            {summary}
          </p>
        )}

        <div className='flex flex-wrap items-center gap-2 mt-4'>
          {job.level && (
            <span className='px-3 py-1 rounded-lg bg-slate-800/90 text-slate-200 text-[11px] font-semibold'>
              {job.level}
            </span>
          )}
          <span className='px-3 py-1 rounded-lg bg-violet-600/25 border border-violet-500/30 text-violet-200 text-[11px] font-bold'>
            CTC: {formatCtcBadge(job.salary)}
          </span>
        </div>
      </div>

      <div className='flex items-center gap-2.5 pt-4 mt-5 border-t border-slate-800/80'>
        <button
          type='button'
          onClick={openJob}
          className='flex-1 bg-white hover:bg-violet-500 hover:text-white text-slate-950 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-center'
        >
          Apply Now
        </button>

        <button
          type='button'
          onClick={openJob}
          className='px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer'
        >
          Details
        </button>
      </div>
    </article>
  );
};

export default JobCard;