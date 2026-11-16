import React from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import JobListing from '../components/JobListing'
import AppDownload from '../components/AppDownload'
import Footer from '../components/Footer'

const Home = () => {
  return (
    <main className="min-h-screen bg-slate-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-300">
      <Navbar />
      <Hero />
      <JobListing />
      <AppDownload />
      <Footer />
    </main>
  )
}

export default Home