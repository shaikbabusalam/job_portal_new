import React, { useContext, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { assets } from '../assets/assets';
import moment from 'moment';
import Footer from '../components/Footer';
import { AppContext } from '../context/AppContext';
import { useAuth, useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const Applications = () => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [isEdit, setIsEdit] = useState(false);
  const [resume, setResume] = useState(null);
  const [interviews, setInterviews] = useState([]);

  const { backendUrl, userData, userApplications, setUserApplications, fetchUserData } = useContext(AppContext);

  const fetchUserApplications = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.get(`${backendUrl}/api/users/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setUserApplications(data.applications);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const fetchUserInterviews = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.get(`${backendUrl}/api/users/interviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setInterviews(data.interviews);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserApplications();
      fetchUserInterviews();
    }
  }, [user]);

  const updateResume = async () => {
    try {
      const formData = new FormData();
      formData.append('resume', resume);

      const token = await getToken();
      if (!token) return;

      const { data } = await axios.post(
        `${backendUrl}/api/users/update-resume`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        await fetchUserData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
    setIsEdit(false);
    setResume(null);
  };

  const getStatusStyle = (status) => {
    switch (status?.trim().toLowerCase()) {
      case 'accepted':
        return { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' };
      case 'rejected':
        return { badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', dot: 'bg-rose-500' };
      default:
        return { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' };
    }
  };

  return (
    <>
      <Navbar />

      <div className='container px-4 min-h-[65vh] 2xl:px-20 mx-auto my-10'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-800 dark:text-white'>My Applications</h1>
          <p className='text-gray-500 dark:text-gray-400 mt-2'>Manage your resume and track your job applications.</p>
        </div>

        {/* Resume Section */}
        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm mb-10'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div className='flex items-center gap-4'>
              <div className='w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center'>
                <img src={assets.profile_upload_icon} alt='Resume' className='w-7 h-7' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-gray-800 dark:text-white'>Your Resume</h2>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                  {resume ? resume.name : (userData?.resume ? 'Resume uploaded' : 'Upload or update your resume')}
                </p>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              {resume ? (
                <button onClick={updateResume} className='bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition'>Save</button>
              ) : isEdit || userData?.resume === "" || !userData?.resume ? (
                <label htmlFor='resumeUpload' className='cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2'>
                  <span>Select Resume</span>
                  <input id='resumeUpload' onChange={e => setResume(e.target.files[0])} accept='application/pdf' type='file' hidden />
                </label>
              ) : (
                <div className='flex gap-2 items-center'>
                  {userData?.resume && (
                    <a href={userData.resume} target='_blank' rel='noopener noreferrer' className='bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition'>Resume</a>
                  )}
                  <button onClick={() => setIsEdit(true)} className='border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition'>Edit</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Interviews Section */}
        <div className='mb-10'>
          <div className='flex items-center justify-between mb-5'>
            <div>
              <h2 className='text-xl font-bold text-gray-800 dark:text-white'>Upcoming Interviews</h2>
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>Interviews scheduled by employers.</p>
            </div>
            <span className='bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-lg text-sm font-semibold'>
              {interviews.length} Scheduled
            </span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {interviews.length > 0 ? (
              interviews.map(interview => (
                <div key={interview._id} className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between'>
                  <div>
                    <div className='flex items-center gap-3 mb-3'>
                      <img src={interview.companyId?.image || assets.company_icon} alt='Company' className='w-10 h-10 object-contain rounded-lg border p-1 bg-white' />
                      <div>
                        <h3 className='font-bold text-gray-800 dark:text-white'>{interview.jobId?.title || 'Job Position'}</h3>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>{interview.companyId?.name || 'Company Name'}</p>
                      </div>
                    </div>

                    <div className='flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300 my-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg'>
                      <span>📅 Date: <strong>{interview.date}</strong></span>
                      <span>🕒 Time: <strong>{interview.time}</strong></span>
                    </div>

                    {interview.note && (
                      <p className='text-xs text-gray-500 dark:text-gray-400 italic mt-2'>Note: "{interview.note}"</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className='col-span-2 text-center py-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>No interviews scheduled yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Jobs Applied Section */}
        <div>
          <div className='flex items-center justify-between mb-5'>
            <div>
              <h2 className='text-xl font-bold text-gray-800 dark:text-white'>Jobs Applied</h2>
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>Track the progress of your applications.</p>
            </div>
            <span className='bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg text-sm font-semibold'>
              {userApplications.length} Applications
            </span>
          </div>

          <div className='overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'>
            <table className='min-w-full'>
              <thead className='bg-gray-50 dark:bg-gray-900/60'>
                <tr>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300'>Company</th>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300'>Job Title</th>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 max-sm:hidden'>Location</th>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 max-sm:hidden'>Date</th>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300'>Status</th>
                </tr>
              </thead>
              <tbody>
                {userApplications.map((app, index) => {
                  const statusStyle = getStatusStyle(app.status || 'Pending');
                  return (
                    <tr key={index} className='border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition'>
                      <td className='py-4 px-5'>
                        <div className='flex items-center gap-3 min-w-[150px]'>
                          <img className='w-10 h-10 object-contain rounded-lg border border-gray-100 dark:border-gray-700 p-1 bg-white' src={app.companyId?.image || assets.company_icon} alt='Company logo' />
                          <span className='font-medium text-gray-800 dark:text-gray-200'>{app.companyId?.name || 'Company'}</span>
                        </div>
                      </td>
                      <td className='py-4 px-5 text-sm text-gray-700 dark:text-gray-300'>{app.jobId?.title || 'Job Title'}</td>
                      <td className='py-4 px-5 text-sm text-gray-500 dark:text-gray-400 max-sm:hidden'>{app.jobId?.location || 'Location'}</td>
                      <td className='py-4 px-5 text-sm text-gray-500 dark:text-gray-400 max-sm:hidden'>{moment(app.date).format('ll')}</td>
                      <td className='py-4 px-5'>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusStyle.badge}`}>
                          <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`}></span>
                          {app.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {userApplications.length === 0 && (
              <div className='text-center py-12'>
                <p className='text-gray-500 dark:text-gray-400'>You haven't applied for any jobs yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Applications;