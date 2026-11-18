import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'

const TRENDING_PILLS = ['React Developer', 'UI/UX Designer', 'Product Manager', 'Data Analyst', 'Remote'];

const Hero = () => {
  const { setSearchFilter, setIsSearched } = useContext(AppContext)
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  const onSearch = () => {
    setSearchFilter({ title: keyword, location: location })
    setIsSearched(true)
  }

  const handlePillClick = (pill) => {
    setKeyword(pill);
    setSearchFilter({ title: pill, location });
    setIsSearched(true);
  };

  return (
    <div className='relative overflow-hidden bg-gradient-to-br from-zinc-950 via-indigo-950 to-violet-950 text-white py-20 sm:py-28 px-4 sm:px-6 text-center rounded-3xl mx-4 sm:mx-8 my-6 shadow-2xl border border-white/10'>
      {/* Decorative Glow Orbs */}
      <div className='absolute top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none' />
      <div className='absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none' />

      <div className='relative max-w-4xl mx-auto'>
        <div className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-violet-300 text-xs font-semibold mb-6 animate-pulse'>
          <span className='w-2 h-2 rounded-full bg-emerald-400' />
          2,400+ Verified Tech Roles & Direct Recruiter Chat
        </div>

        <h1 className='text-4xl sm:text-6xl font-black tracking-tight mb-6 leading-tight'>
          Land Your Next Role With <br />
          <span className='bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent'>
            Direct Recruiter Chat.
          </span>
        </h1>

        <p className='text-sm sm:text-lg text-zinc-300 mb-10 max-w-2xl mx-auto leading-relaxed font-light'>
          Skip the application black hole. Apply with one click, check your ATS score, and chat instantly the moment you are shortlisted.
        </p>

        {/* Glassmorphic Search Bar */}
        <div className='bg-white/10 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-zinc-800 rounded-2xl p-2.5 sm:p-3 flex flex-col md:flex-row items-center gap-2.5 shadow-2xl max-w-3xl mx-auto'>
          <div className='flex items-center gap-3 px-4 py-2.5 w-full md:flex-1 bg-white/5 dark:bg-zinc-800/50 rounded-xl border border-white/10 dark:border-zinc-700'>
            <img src={assets.search_icon} alt='Search' className='w-4 h-4 opacity-70 shrink-0 filter invert' />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              type='text'
              placeholder='Job title, keywords, or company...'
              className='w-full text-xs sm:text-sm bg-transparent outline-none text-white placeholder-zinc-400'
            />
          </div>

          <div className='flex items-center gap-3 px-4 py-2.5 w-full md:w-72 bg-white/5 dark:bg-zinc-800/50 rounded-xl border border-white/10 dark:border-zinc-700'>
            <img src={assets.location_icon} alt='Location' className='w-4 h-4 opacity-70 shrink-0 filter invert' />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              type='text'
              placeholder='City or remote...'
              className='w-full text-xs sm:text-sm bg-transparent outline-none text-white placeholder-zinc-400'
            />
          </div>

          <button
            onClick={onSearch}
            className='w-full md:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold px-8 py-3.5 rounded-xl transition shadow-lg cursor-pointer shrink-0'
          >
            Search Jobs
          </button>
        </div>

        {/* Trending Searches */}
        <div className='flex flex-wrap items-center justify-center gap-2 mt-6'>
          <span className='text-xs text-zinc-400 font-medium'>Trending:</span>
          {TRENDING_PILLS.map((pill) => (
            <button
              key={pill}
              onClick={() => handlePillClick(pill)}
              className='text-xs bg-white/10 hover:bg-white/20 text-zinc-200 px-3 py-1 rounded-full border border-white/10 transition cursor-pointer'
            >
              {pill}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Hero