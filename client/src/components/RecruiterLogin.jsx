import React, { useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const RecruiterLogin = ({ onClose }) => {
  const navigate = useNavigate()
  const [state, setState] = useState('Login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [image, setImage] = useState(null)
  const [isTextDataSubmited, setIsTextDataSubmited] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { setShowRecruiterLogin, backendUrl, setCompanyToken, setCompanyData } = useContext(AppContext)

  const handleClose = () => {
    if (onClose) onClose()
    setShowRecruiterLogin(false)
  }

  const onSubmitHandler = async (e) => {
    e.preventDefault()

    if (state === 'Sign Up' && !isTextDataSubmited) {
      if (!name.trim() || !email.trim() || password.length < 6) {
        toast.error('Please enter company name, valid email, and a password (min 6 chars).')
        return
      }
      return setIsTextDataSubmited(true)
    }

    if (state === 'Sign Up' && !image) {
      toast.error('Please upload your company logo.')
      return
    }

    try {
      setSubmitting(true)

      if (state === 'Login') {
        const { data } = await axios.post(backendUrl + '/api/company/login', {
          email: email.trim(),
          password
        })

        if (data.success) {
          sessionStorage.setItem('companyToken', data.token)
          setCompanyData(data.company)
          setCompanyToken(data.token)
          toast.success(`Welcome back, ${data.company.name}!`)
          handleClose()
          navigate('/dashboard')
        } else {
          toast.error(data.message)
        }
      } else {
        const formData = new FormData()
        formData.append('name', name.trim())
        formData.append('password', password)
        formData.append('email', email.trim())
        formData.append('image', image)

        const { data } = await axios.post(backendUrl + '/api/company/register', formData)

        if (data.success) {
          sessionStorage.setItem('companyToken', data.token)
          setCompanyData(data.company)
          setCompanyToken(data.token)
          toast.success('Company account created!')
          handleClose()
          navigate('/dashboard')
        } else {
          toast.error(data.message)
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div
      onClick={handleClose}
      className='fixed inset-0 z-50 backdrop-blur-sm bg-black/40 flex justify-center items-center px-4'
    >
      <form
        onSubmit={onSubmitHandler}
        onClick={(e) => e.stopPropagation()}
        className='relative bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-2xl text-slate-600 dark:text-gray-200 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800'
      >
        <h1 className='text-center text-2xl text-neutral-800 dark:text-white font-bold'>
          Recruiter {state}
        </h1>
        <p className='text-sm text-center text-gray-500 dark:text-gray-400 mt-1'>
          {state === 'Login'
            ? 'Welcome back! Sign in to manage jobs & applicants.'
            : 'Create your company workspace to start hiring.'}
        </p>

        {state === 'Sign Up' && isTextDataSubmited ? (
          <div className='flex flex-col items-center gap-4 my-8'>
            <label htmlFor='image' className='cursor-pointer flex flex-col items-center gap-3'>
              <img
                className='w-20 h-20 rounded-full object-cover border-2 border-indigo-200 p-1 bg-white shadow-sm'
                src={image ? URL.createObjectURL(image) : assets.upload_area}
                alt='Company Logo'
              />
              <span className='text-sm font-medium text-indigo-600 hover:underline'>
                {image ? 'Change Company Logo' : 'Upload Company Logo'}
              </span>
              <input
                onChange={(e) => setImage(e.target.files[0])}
                type='file'
                id='image'
                accept='image/*'
                hidden
              />
            </label>
            <button
              type='button'
              onClick={() => setIsTextDataSubmited(false)}
              className='text-xs text-gray-400 hover:text-gray-600 cursor-pointer'
            >
              ← Back to details
            </button>
          </div>
        ) : (
          <div className='space-y-4 mt-6'>
            {state !== 'Login' && (
              <div className='border border-gray-300 dark:border-gray-700 px-4 py-2.5 flex items-center gap-3 rounded-xl bg-gray-50/60 dark:bg-gray-800 focus-within:border-indigo-500 transition'>
                <img src={assets.person_icon} alt='' className='w-4 h-4 opacity-70' />
                <input
                  className='outline-none text-sm bg-transparent w-full text-gray-800 dark:text-white'
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                  type='text'
                  placeholder='Company Name'
                  required
                />
              </div>
            )}

            <div className='border border-gray-300 dark:border-gray-700 px-4 py-2.5 flex items-center gap-3 rounded-xl bg-gray-50/60 dark:bg-gray-800 focus-within:border-indigo-500 transition'>
              <img src={assets.email_icon} alt='' className='w-4 h-4 opacity-70' />
              <input
                className='outline-none text-sm bg-transparent w-full text-gray-800 dark:text-white'
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                type='email'
                placeholder='Work Email ID'
                required
              />
            </div>

            <div className='border border-gray-300 dark:border-gray-700 px-4 py-2.5 flex items-center gap-3 rounded-xl bg-gray-50/60 dark:bg-gray-800 focus-within:border-indigo-500 transition'>
              <img src={assets.lock_icon} alt='' className='w-4 h-4 opacity-70' />
              <input
                className='outline-none text-sm bg-transparent w-full text-gray-800 dark:text-white'
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                type={showPassword ? 'text' : 'password'}
                placeholder='Password'
                required
              />
              <button
                type='button'
                onClick={() => setShowPassword((prev) => !prev)}
                className='text-xs text-gray-400 hover:text-indigo-600 cursor-pointer shrink-0'
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        )}

        <button
          type='submit'
          disabled={submitting}
          className='bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 w-full text-white py-2.5 rounded-xl mt-6 font-medium shadow-md transition cursor-pointer disabled:opacity-50'
        >
          {submitting
            ? 'Please wait...'
            : state === 'Login'
              ? 'Login'
              : isTextDataSubmited
                ? 'Create Account'
                : 'Next →'}
        </button>

        {state === 'Login' ? (
          <p className='mt-5 text-center text-sm'>
            Don't have a company account?{' '}
            <span
              className='text-indigo-600 font-semibold cursor-pointer hover:underline'
              onClick={() => {
                setState('Sign Up')
                setIsTextDataSubmited(false)
              }}
            >
              Sign Up
            </span>
          </p>
        ) : (
          <p className='mt-5 text-center text-sm'>
            Already have an account?{' '}
            <span
              className='text-indigo-600 font-semibold cursor-pointer hover:underline'
              onClick={() => {
                setState('Login')
                setIsTextDataSubmited(false)
              }}
            >
              Login
            </span>
          </p>
        )}

        <button
          type='button'
          onClick={handleClose}
          aria-label='Close modal'
          className='absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer'
        >
          <img src={assets.cross_icon} alt='Close' className='w-3.5 h-3.5' />
        </button>
      </form>
    </div>
  )
}

export default RecruiterLogin