import React, { useContext, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { assets } from '../assets/assets';
import moment from 'moment';
import Footer from '../components/Footer';
import { AppContext } from '../context/AppContext';
import { useAuth, useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Applications = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [isEdit, setIsEdit] = useState(false);
  const [resume, setResume] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loadingChatId, setLoadingChatId] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);

  const {
    backendUrl,
    userData,
    userApplications,
    setUserApplications,
    fetchUserData,
    fetchUserApplications,
    pauseAppSyncRef,
  } = useContext(AppContext);

  const fetchUserInterviews = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.get(`${backendUrl}/api/users/interviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setInterviews(data.interviews || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (fetchUserApplications) fetchUserApplications(true);
    fetchUserInterviews();

    const interval = setInterval(fetchUserInterviews, 4000);
    return () => clearInterval(interval);
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

  const handleOpenChat = async (jobId, recruiterId) => {
    try {
      setLoadingChatId(jobId);
      const token = await getToken();

      const response = await axios.post(
        `${backendUrl}/api/chat/room`,
        {
          jobId,
          applicantId: user?.id,
          recruiterId: recruiterId || '',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.chat?._id) {
        navigate(`/chat/${response.data.chat._id}?role=applicant`);
      } else {
        toast.error(response.data.message || 'Could not open chat room.');
        setLoadingChatId(null);
      }
    } catch (err) {
      console.error('Failed to open chat room:', err);
      toast.error(err.response?.data?.message || 'Network error while opening chat.');
      setLoadingChatId(null);
    }
  };

  const handleWithdrawApplication = async (applicationId) => {
    const previousApps = userApplications;
    if (pauseAppSyncRef) pauseAppSyncRef.current = true;
    setWithdrawingId(applicationId);
    setUserApplications((prev) => prev.filter((item) => item._id !== applicationId));
    setInterviews((prev) =>
      prev.filter((item) => String(item.applicationId?._id || item.applicationId) !== String(applicationId))
    );

    try {
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.post(
        `${backendUrl}/api/users/delete-application`,
        { id: applicationId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.info(data.message || 'Application withdrawn');
      } else {
        setUserApplications(previousApps);
        toast.error(data.message);
      }
    } catch (error) {
      setUserApplications(previousApps);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setWithdrawingId(null);
      if (pauseAppSyncRef) pauseAppSyncRef.current = false;
    }
  };

  const visibleApplications = (userApplications || []).filter(
    (app) => app.jobId && app.status?.trim().toLowerCase() !== 'rejected'
  );

  const visibleInterviews = interviews.filter((item) => item.jobId);

  const getStatusStyle = (status) => {
    switch (status?.trim().toLowerCase()) {
      case 'accepted':
        return { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' };
      default:
        return { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' };
    }
  };

  return (
    <>
      <Navbar />

      <div className='w-full max-w-7xl px-4 min-h-[65vh] 2xl:px-10 mx-auto my-6 sm:my-10 overflow-hidden'>
        <div className='mb-6 sm:mb-8'>
          <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white'>My Applications</h1>
          <p className='text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1.5'>Manage your resume, interviews, and job applications.</p>
        </div>

        {/* Resume Section */}
        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-6 shadow-sm mb-8 sm:mb-10'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div className='flex items-center gap-3.5 sm:gap-4'>
              <div className='w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0'>
                <img src={assets.profile_upload_icon} alt='Resume' className='w-6 h-6 sm:w-7 sm:h-7' />
              </div>
              <div className='min-w-0'>
                <h2 className='text-base sm:text-lg font-semibold text-gray-800 dark:text-white'>Your Resume</h2>
                <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate'>
                  {resume ? resume.name : (userData?.resume ? 'Resume uploaded' : 'Upload or update your resume')}
                </p>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2.5'>
              {resume ? (
                <button onClick={updateResume} className='w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer'>Save</button>
              ) : isEdit || userData?.resume === "" || !userData?.resume ? (
                <label htmlFor='resumeUpload' className='w-full sm:w-auto justify-center cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2'>
                  <span>Select Resume</span>
                  <input id='resumeUpload' onChange={e => setResume(e.target.files[0])} accept='application/pdf' type='file' hidden />
                </label>
              ) : (
                <div className='flex gap-2 items-center w-full sm:w-auto'>
                  {userData?.resume && (
                    <a href={userData.resume} target='_blank' rel='noopener noreferrer' className='flex-1 sm:flex-initial text-center bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition'>Resume</a>
                  )}
                  <button onClick={() => setIsEdit(true)} className='flex-1 sm:flex-initial border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer'>Edit</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Interviews Section */}
        <div className='mb-8 sm:mb-10'>
          <div className='flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-5'>
            <div>
              <h2 className='text-lg sm:text-xl font-bold text-gray-800 dark:text-white'>Upcoming Interviews</h2>
              <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5'>Interviews scheduled by employers.</p>
            </div>
            <span className='bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold'>
              {visibleInterviews.length} Scheduled
            </span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {visibleInterviews.length > 0 ? (
              visibleInterviews.map((interview) => (
                <div key={interview._id} className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between'>
                  <div>
                    <div className='flex items-center gap-3 mb-3'>
                      <img src={interview.companyId?.image || assets.company_icon} alt='Company' className='w-10 h-10 object-contain rounded-lg border p-1 bg-white shrink-0' />
                      <div className='min-w-0'>
                        <h3 className='font-bold text-sm sm:text-base text-gray-800 dark:text-white truncate'>{interview.jobId?.title || 'Job Position'}</h3>
                        <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>{interview.companyId?.name || 'Company Name'}</p>
                      </div>
                    </div>

                    <div className='flex flex-wrap gap-3 sm:gap-4 text-xs text-gray-600 dark:text-gray-300 my-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg'>
                      <span>📅 Date: <strong>{interview.date}</strong></span>
                      <span>🕒 Time: <strong>{interview.time}</strong></span>
                    </div>

                    {interview.note && (
                      <p className='text-xs text-gray-500 dark:text-gray-400 italic mt-2 break-words'>Note: "{interview.note}"</p>
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
          <div className='flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-5'>
            <div>
              <h2 className='text-lg sm:text-xl font-bold text-gray-800 dark:text-white'>Jobs Applied</h2>
              <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                Track the progress of your applications. Use the scrollbar below to view all columns.
              </p>
            </div>
            <span className='bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold'>
              {visibleApplications.length} Applications
            </span>
          </div>

          {/* Visible Horizontal Scroller */}
          <div className='w-full table-scroll-x bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm pb-1'>
            <table className='w-full min-w-[900px]'>
              <thead className='bg-gray-50 dark:bg-gray-900/60'>
                <tr>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap'>Company</th>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap'>Job Title</th>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap'>Location</th>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap'>Date</th>
                  <th className='py-4 px-5 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap'>Status</th>
                  <th className='py-4 px-5 text-center text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap'>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleApplications.map((app, index) => {
                  const statusStyle = getStatusStyle(app.status || 'Pending');
                  const isAccepted = app.status?.trim().toLowerCase() === 'accepted';
                  const jobId = app.jobId?._id || app.jobId;
                  const recruiterId = app.companyId?._id || app.companyId || app.jobId?.companyId || '';

                  return (
                    <tr key={app._id || index} className='border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition'>
                      <td className='py-4 px-5 whitespace-nowrap'>
                        <div className='flex items-center gap-3 min-w-[150px]'>
                          <img className='w-10 h-10 object-contain rounded-lg border border-gray-100 dark:border-gray-700 p-1 bg-white shrink-0' src={app.companyId?.image || assets.company_icon} alt='Company logo' />
                          <span className='font-medium text-gray-800 dark:text-gray-200'>{app.companyId?.name || 'Company'}</span>
                        </div>
                      </td>
                      <td className='py-4 px-5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap'>{app.jobId?.title || 'Job Title'}</td>
                      <td className='py-4 px-5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap'>{app.jobId?.location || 'Location'}</td>
                      <td className='py-4 px-5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap'>{moment(app.date).format('ll')}</td>
                      <td className='py-4 px-5 whitespace-nowrap'>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${statusStyle.badge}`}>
                          <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`}></span>
                          {app.status || 'Pending'}
                        </span>
                      </td>
                      <td className='py-4 px-5 text-center whitespace-nowrap'>
                        <div className='inline-flex items-center gap-2.5'>
                          {isAccepted ? (
                            <button
                              onClick={() => handleOpenChat(jobId, recruiterId)}
                              disabled={loadingChatId === jobId}
                              className='inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap'
                              title='Chat with Recruiter'
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {loadingChatId === jobId ? 'Opening...' : 'Chat'}
                            </button>
                          ) : (
                            <span className='text-xs text-gray-400 dark:text-gray-500 italic px-2'>
                              Locked
                            </span>
                          )}

                          <button
                            onClick={() => handleWithdrawApplication(app._id)}
                            disabled={withdrawingId === app._id}
                            className='inline-flex items-center gap-1.5 border border-rose-200 dark:border-rose-800/60 bg-rose-50/80 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 dark:text-rose-400 text-xs font-medium px-3.5 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 whitespace-nowrap'
                            title='Withdraw your application for this role'
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                            {withdrawingId === app._id ? 'Withdrawing...' : 'Withdraw'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visibleApplications.length === 0 && (
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