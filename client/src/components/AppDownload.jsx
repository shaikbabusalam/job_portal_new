
import React from 'react'
import { assets } from '../assets/assets'

const AppDownload = () => {
  return (
    <div className='max-w-6xl px-4 mx-auto my-16'>

      <div className='relative bg-gradient-to-r from-violet-50 to-purple-50
      dark:from-gray-800 dark:to-gray-900
      rounded-xl overflow-hidden px-8 md:px-10 py-6
      flex items-center justify-between min-h-[210px] transition-colors duration-300'>

        {/* Left Content */}
        <div className='z-10 max-w-md'>

          <h1 className='text-xl md:text-2xl font-semibold
          text-gray-900 dark:text-white leading-snug capitalize'>
            Download Mobile App For
            <br />
            Better Experience
          </h1>

          <div className='flex items-center gap-3 mt-6'>

            <a href='#'>
              <img
                src={assets.play_store}
                alt='Google Play'
                className='h-9 w-auto'
              />
            </a>

            <a href='#'>
              <img
                src={assets.app_store}
                alt='App Store'
                className='h-9 w-auto'
              />
            </a>

          </div>
        </div>

        {/* Right Image */}
        <div className='hidden sm:block h-[190px] self-end'>
          <img
            src={assets.app_main_img}
            alt='Mobile App'
            className='h-full w-auto object-contain object-bottom'
          />
        </div>

      </div>
    </div>
  )
}

export default AppDownload
