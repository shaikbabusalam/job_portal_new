import React, { useContext, useState, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const RecruiterLogin = () => {
  const navigate = useNavigate()
  const { setShowRecruiterLogin, backendUrl, setCompanyToken, setCompanyData } = useContext(AppContext)

  const [state, setState] = useState('Login') // 'Login', 'Sign Up', or 'Forgot Password'
  const [step, setStep] = useState(1) // Step 1: Credentials, Step 2: Logo upload
  const [loading, setLoading] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Company Logo State
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  // Disable background scrolling while popup is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Generate and cleanup company logo preview URL
  useEffect(() => {
    if (!image) {
      setImagePreview('')
      return
    }

    const previewUrl = URL.createObjectURL(image)
    setImagePreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [image])

  const inputClass =
    'w-full h-11 border border-gray-200 rounded-full px-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 transition'

  // Change form state
  const changeState = (newState) => {
    setState(newState)
    setStep(1)
    setPassword('')
    setShowPassword(false)
    setImage(null)
  }

  // Close popup
  const closePopup = () => {
    setShowRecruiterLogin(false)
  }

  // Handle logo file selection and validation
  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5 MB.')
      e.target.value = ''
      return
    }

    setImage(file)
  }

  // Form submission with backend integration
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    if (state === 'Forgot Password') {
      toast.info('Password reset requires backend integration.')
      return
    }

    // Sign Up Step 1 -> Move to Logo Upload Step
    if (state === 'Sign Up' && step === 1) {
      if (!companyName || !email || !password) {
        toast.error('Please fill in all fields.')
        return
      }
      setStep(2)
      return
    }

    setLoading(true)

    try {
      if (state === 'Login') {
        const { data } = await axios.post(`${backendUrl}/api/company/login`, { email, password })

        if (data.success) {
          setCompanyToken(data.token)
          localStorage.setItem('companyToken', data.token)
          setCompanyData(data.company)
          setShowRecruiterLogin(false)
          navigate('/dashboard')
          toast.success('Logged in successfully!')
        } else {
          toast.error(data.message)
        }
      } else if (state === 'Sign Up' && step === 2) {
        // Register with multipart form data including company logo
        const formData = new FormData()
        formData.append('name', companyName)
        formData.append('email', email)
        formData.append('password', password)
        
        if (image) {
          formData.append('image', image)
        }

        const { data } = await axios.post(`${backendUrl}/api/company/register`, formData)

        if (data.success) {
          setCompanyToken(data.token)
          localStorage.setItem('companyToken', data.token)
          setCompanyData(data.company)
          setShowRecruiterLogin(false)
          navigate('/dashboard')
          toast.success('Company registered successfully!')
        } else {
          toast.error(data.message)
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md px-4 py-6 overflow-y-auto">
      <div className="relative w-full max-w-[360px] shrink-0 bg-white rounded-xl shadow-2xl px-7 py-7 text-gray-800 my-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={closePopup}
          className="absolute right-4 top-3 text-gray-400 hover:text-gray-800 text-xl"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Heading */}
        <div className="text-center mb-5">
          <h2 className="text-xl font-semibold text-gray-800">
            {state === 'Login'
              ? 'Recruiter Login'
              : state === 'Sign Up'
                ? 'Recruiter Sign Up'
                : 'Forgot Password?'}
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            {state === 'Login'
              ? 'Welcome back! Please sign in to continue'
              : state === 'Sign Up'
                ? step === 1
                  ? 'Welcome! Create your recruiter account'
                  : 'Upload your company logo (Optional)'
                : 'Enter your email to reset your password'}
          </p>
        </div>

        {/* Progress Bar for Sign Up */}
        {state === 'Sign Up' && (
          <div className="flex gap-2 mb-5">
            <div className="h-1.5 flex-1 rounded-full bg-blue-600" />
            <div
              className={`h-1.5 flex-1 rounded-full ${
                step === 2 ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* SIGN UP STEP 1 */}
          {state === 'Sign Up' && step === 1 && (
            <>
              <input
                type="text"
                placeholder="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClass}
                required
              />

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-16`}
                  minLength={6}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3 text-xs text-blue-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Next
              </button>
            </>
          )}

          {/* SIGN UP STEP 2: LOGO UPLOAD */}
          {state === 'Sign Up' && step === 2 && (
            <>
              <div className="flex flex-col items-center gap-3 py-4">
                <label
                  htmlFor="company-logo"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <img
                    src={imagePreview || assets.upload_area}
                    alt="Company Logo Preview"
                    className="w-20 h-20 rounded-full object-cover border border-gray-200 p-2 hover:border-blue-500 transition shadow-sm"
                  />

                  <span className="text-sm text-blue-600 font-medium mt-3">
                    {image ? 'Change Logo' : 'Upload Company Logo'}
                  </span>

                  <span className="text-xs text-gray-400 mt-1">
                    PNG, JPG or WEBP (Max 5 MB)
                  </span>
                </label>

                <input
                  type="file"
                  id="company-logo"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {image && (
                  <p className="text-xs text-green-600 font-medium text-center break-all">
                    Selected: {image.name}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => setStep(1)}
                className="w-full h-11 rounded-full border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 transition disabled:opacity-50"
              >
                Back
              </button>
            </>
          )}

          {/* LOGIN */}
          {state === 'Login' && (
            <>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-16`}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3 text-xs text-blue-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => changeState('Forgot Password')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </>
          )}

          {/* FORGOT PASSWORD */}
          {state === 'Forgot Password' && (
            <>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />

              <button
                type="submit"
                className="w-full h-11 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Send Reset Link
              </button>
            </>
          )}
        </form>

        {/* Bottom Navigation Links */}
        <div className="text-center mt-6 text-xs text-gray-500">
          {state === 'Login' && (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => changeState('Sign Up')}
                className="text-blue-600 font-medium hover:underline"
              >
                Sign Up
              </button>
            </p>
          )}

          {state === 'Sign Up' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => changeState('Login')}
                className="text-blue-600 font-medium hover:underline"
              >
                Login
              </button>
            </p>
          )}

          {state === 'Forgot Password' && (
            <button
              type="button"
              onClick={() => changeState('Login')}
              className="text-blue-600 font-medium hover:underline"
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecruiterLogin