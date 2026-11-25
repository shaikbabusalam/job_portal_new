import React, { useEffect, useState, useContext, useRef } from 'react';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';

const ViewApplications = () => {
  const { backendUrl, companyToken, companyData } = useContext(AppContext);
  const navigate = useNavigate();

  const [applicants, setApplicants] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [loadingChatId, setLoadingChatId] = useState(null);
  const [confirmTerminateId, setConfirmTerminateId] = useState(null);

  const [scheduleModalApp, setScheduleModalApp] = useState(null);
  const [editingInterview, setEditingInterview] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewNote, setInterviewNote] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const isMutatingRef = useRef(false);
  const token = companyToken || sessionStorage.getItem('companyToken');

  const fetchCompanyData = async (silent = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (silent && isMutatingRef.current) return;

    try {
      if (!silent) setLoading(true);
      const [appsRes, interviewsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/company/applicants`, { headers: { token } }),
        axios.get(`${backendUrl}/api/company/interviews`, { headers: { token } }),
      ]);

      if (!isMutatingRef.current) {
        if (appsRes.data.success) {
          setApplicants((appsRes.data.applications || []).slice().reverse());
        } else if (!silent) {
          toast.error(appsRes.data.message);
        }

        if (interviewsRes.data.success) {
          setInterviews(interviewsRes.data.interviews || []);
        }
      }
    } catch (error) {
      if (!silent) toast.error(error.response?.data?.message || error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData(false);
    const interval = setInterval(() => fetchCompanyData(true), 4000);
    return () => clearInterval(interval);
  }, [token, backendUrl]);

  const handleChangeStatus = async (applicationId, status) => {
    const previousApplicants = applicants;
    const previousInterviews = interviews;
    isMutatingRef.current = true;
    setUpdatingId(applicationId);
    setConfirmTerminateId(null);

    if (status === 'Rejected' || status === 'Terminated') {
      setApplicants((prev) => prev.filter((item) => item._id !== applicationId));
      setInterviews((prev) =>
        prev.filter((item) => String(item.applicationId?._id || item.applicationId) !== String(applicationId))
      );
    } else {
      setApplicants((prev) =>
        prev.map((item) =>
          item._id === applicationId ? { ...item, status: 'Accepted' } : item
        )
      );
    }

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/company/change-status`,
        { id: applicationId, status },
        { headers: { token } }
      );

      if (data.success) {
        if (status === 'Rejected') {
          toast.info('Application rejected and removed');
        } else if (status === 'Terminated') {
          toast.warn('Selected applicant terminated and removed');
        } else {
          toast.success('Application Accepted');
        }
      } else {
        setApplicants(previousApplicants);
        setInterviews(previousInterviews);
        toast.error(data.message);
      }
    } catch (error) {
      setApplicants(previousApplicants);
      setInterviews(previousInterviews);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setUpdatingId(null);
      isMutatingRef.current = false;
    }
  };

  const handleRecruiterOpenChat = async (jobId, applicantId, companyId) => {
    try {
      setLoadingChatId(String(jobId) + String(applicantId));

      const response = await axios.post(
        `${backendUrl}/api/chat/room`,
        {
          jobId,
          applicantId,
          recruiterId: companyId || companyData?._id || '',
        },
        { headers: { token } }
      );

      if (response.data.success && response.data.chat?._id) {
        navigate(`/chat/${response.data.chat._id}?role=recruiter`);
      } else {
        toast.error(response.data.message || 'Could not open chat room.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error opening chat room.');
    } finally {
      setLoadingChatId(null);
    }
  };

  const openScheduleModal = (applicant) => {
    setEditingInterview(null);
    setScheduleModalApp(applicant);
    setInterviewDate('');
    setInterviewTime('');
    setInterviewNote('');
  };

  const openEditInterviewModal = (interview) => {
    setScheduleModalApp(null);
    setEditingInterview(interview);
    setInterviewDate(interview.date || '');
    setInterviewTime(interview.time || '');
    setInterviewNote(interview.note || '');
  };

  const closeInterviewModal = () => {
    setScheduleModalApp(null);
    setEditingInterview(null);
    setInterviewDate('');
    setInterviewTime('');
    setInterviewNote('');
  };

  const handleSaveInterview = async (e) => {
    e.preventDefault();
    if ((!scheduleModalApp && !editingInterview) || !interviewDate || !interviewTime) return;

    try {
      setScheduling(true);
      isMutatingRef.current = true;

      if (editingInterview) {
        const previousInterviews = interviews;
        setInterviews((prev) =>
          prev.map((item) =>
            item._id === editingInterview._id
              ? { ...item, date: interviewDate, time: interviewTime, note: interviewNote.trim() }
              : item
          )
        );

        const { data } = await axios.post(
          `${backendUrl}/api/company/update-interview`,
          {
            id: editingInterview._id,
            date: interviewDate,
            time: interviewTime,
            note: interviewNote.trim(),
          },
          { headers: { token } }
        );

        if (data.success) {
          toast.success(data.message || 'Interview updated!');
          closeInterviewModal();
        } else {
          setInterviews(previousInterviews);
          toast.error(data.message);
        }
      } else {
        const { data } = await axios.post(
          `${backendUrl}/api/company/schedule-interview`,
          {
            applicationId: scheduleModalApp._id,
            date: interviewDate,
            time: interviewTime,
            note: interviewNote.trim(),
          },
          { headers: { token } }
        );

        if (data.success) {
          toast.success(data.message || 'Interview scheduled!');
          closeInterviewModal();
          isMutatingRef.current = false;
          fetchCompanyData(true);
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setScheduling(false);
      isMutatingRef.current = false;
    }
  };

  const handleDeleteInterview = async (id) => {
    const previousInterviews = interviews;
    isMutatingRef.current = true;
    setInterviews((prev) => prev.filter((item) => item._id !== id));

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/company/delete-interview`,
        { id },
        { headers: { token } }
      );
      if (data.success) {
        toast.success('Interview removed');
      } else {
        setInterviews(previousInterviews);
        toast.error(data.message);
      }
    } catch (error) {
      setInterviews(previousInterviews);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      isMutatingRef.current = false;
    }
  };

  if (loading) return <Loading />;

  const activeApplicants = applicants.filter((item) => {
    const normalized = item.status?.trim().toLowerCase();
    return item.jobId && item.userId && normalized !== 'rejected' && normalized !== 'terminated';
  });

  const isModalOpen = Boolean(scheduleModalApp || editingInterview);
  const modalCandidateName = editingInterview
    ? editingInterview.userId?.name
    : scheduleModalApp?.userId?.name;
  const modalRoleTitle = editingInterview
    ? editingInterview.jobId?.title
    : scheduleModalApp?.jobId?.title;

  return (
    <div className='w-full max-w-6xl mx-auto px-1 sm:px-4 my-3 sm:my-6 overflow-hidden'>
      <div className='mb-6 sm:mb-8'>
        <h2 className='text-xl sm:text-2xl font-bold text-white'>View Applications</h2>
        <p className='text-xs sm:text-sm text-slate-400 mt-1'>
          Accept candidates to unlock direct chat and schedule or edit interviews, or terminate selected candidates when needed.
        </p>
      </div>

      <div className='w-full table-scroll-x bg-[#0b1220] rounded-2xl border border-slate-800 shadow-sm mb-10 pb-1'>
        <table className='w-full min-w-[980px]'>
          <thead className='bg-[#070c16]'>
            <tr>
              <th className='py-4 px-5 text-left text-sm font-semibold text-slate-300 whitespace-nowrap'>#</th>
              <th className='py-4 px-5 text-left text-sm font-semibold text-slate-300 whitespace-nowrap'>User name</th>
              <th className='py-4 px-5 text-left text-sm font-semibold text-slate-300 whitespace-nowrap'>Job Title</th>
              <th className='py-4 px-5 text-left text-sm font-semibold text-slate-300 whitespace-nowrap'>Location</th>
              <th className='py-4 px-5 text-left text-sm font-semibold text-slate-300 whitespace-nowrap'>Resume</th>
              <th className='py-4 px-5 text-center text-sm font-semibold text-slate-300 whitespace-nowrap'>Action / Chat</th>
            </tr>
          </thead>
          <tbody>
            {activeApplicants.map((applicant, index) => {
              const normalizedStatus = applicant.status?.trim().toLowerCase() || 'pending';
              const isAccepted = normalizedStatus === 'accepted';
              const jobId = applicant.jobId?._id || applicant.jobId;
              const applicantId = applicant.userId?._id || applicant.userId;
              const companyId =
                applicant.companyId?._id ||
                applicant.companyId ||
                applicant.jobId?.companyId ||
                companyData?._id;

              return (
                <tr key={applicant._id || index} className='border-t border-slate-800/80 hover:bg-slate-900/60 transition'>
                  <td className='py-4 px-5 text-sm text-slate-300 whitespace-nowrap'>{index + 1}</td>
                  <td className='py-4 px-5 whitespace-nowrap'>
                    <div className='flex items-center gap-3'>
                      <img
                        src={applicant.userId?.image || assets.profile_icon}
                        alt=''
                        className='w-10 h-10 rounded-full object-cover shrink-0'
                      />
                      <div>
                        <span className='font-semibold text-white'>
                          {applicant.userId?.name || 'Applicant'}
                        </span>
                        <div className='text-xs mt-1'>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-semibold ${
                            isAccepted
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {applicant.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className='py-4 px-5 text-sm text-slate-200 whitespace-nowrap'>
                    {applicant.jobId?.title || 'Position'}
                  </td>
                  <td className='py-4 px-5 text-sm text-slate-300 whitespace-nowrap'>
                    {applicant.jobId?.location || 'Location'}
                  </td>
                  <td className='py-4 px-5 text-sm whitespace-nowrap'>
                    {applicant.userId?.resume ? (
                      <a
                        href={applicant.userId.resume}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1.5 text-indigo-600 bg-white hover:bg-slate-100 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap'
                      >
                        Resume 📄
                      </a>
                    ) : (
                      <span className='text-xs text-slate-400 italic'>No resume</span>
                    )}
                  </td>
                  <td className='py-4 px-5 text-center whitespace-nowrap'>
                    {isAccepted ? (
                      <div className='inline-flex items-center gap-2'>
                        <button
                          onClick={() => handleRecruiterOpenChat(jobId, applicantId, companyId)}
                          disabled={loadingChatId === String(jobId) + String(applicantId)}
                          className='inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap'
                          title='Chat with Applicant'
                        >
                          💬 {loadingChatId === String(jobId) + String(applicantId) ? 'Opening...' : 'Chat'}
                        </button>
                        <button
                          onClick={() => openScheduleModal(applicant)}
                          className='inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-purple-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition cursor-pointer whitespace-nowrap'
                          title='Schedule Interview'
                        >
                          📅 Interview
                        </button>

                        {confirmTerminateId === applicant._id ? (
                          <div className='inline-flex items-center gap-1.5 bg-rose-950/90 border border-rose-500/50 px-2.5 py-1.5 rounded-lg'>
                            <span className='text-[11px] font-semibold text-rose-200'>Terminate?</span>
                            <button
                              onClick={() => handleChangeStatus(applicant._id, 'Terminated')}
                              disabled={updatingId === applicant._id}
                              className='bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer'
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmTerminateId(null)}
                              className='text-slate-300 hover:text-white text-[11px] font-medium px-1.5 py-0.5 cursor-pointer'
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmTerminateId(applicant._id)}
                            disabled={updatingId === applicant._id}
                            className='inline-flex items-center gap-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer disabled:opacity-50 whitespace-nowrap'
                            title='Terminate selected applicant'
                          >
                            ✕ Terminate
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className='inline-flex items-center gap-2'>
                        <button
                          onClick={() => handleChangeStatus(applicant._id, 'Accepted')}
                          disabled={updatingId === applicant._id}
                          className='bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 whitespace-nowrap'
                        >
                          {updatingId === applicant._id ? '...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleChangeStatus(applicant._id, 'Rejected')}
                          disabled={updatingId === applicant._id}
                          className='bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium px-3.5 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 whitespace-nowrap'
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {activeApplicants.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-slate-400'>No job applications found.</p>
          </div>
        )}
      </div>

      {/* Scheduled Interviews Section */}
      {interviews.length > 0 && (
        <div>
          <h3 className='text-base sm:text-lg font-bold text-white mb-4'>
            Scheduled Interviews ({interviews.length})
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {interviews.map((item) => (
              <div key={item._id} className='bg-[#0b1220] border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between'>
                <div>
                  <div className='flex items-center justify-between gap-2 mb-2'>
                    <p className='font-semibold text-white text-sm truncate'>
                      {item.userId?.name || 'Candidate'}
                    </p>
                    <div className='flex items-center gap-3 shrink-0'>
                      <button
                        onClick={() => openEditInterviewModal(item)}
                        className='text-xs text-indigo-400 hover:underline font-medium cursor-pointer'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteInterview(item._id)}
                        className='text-xs text-rose-400 hover:underline font-medium cursor-pointer'
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className='text-xs text-indigo-400 font-medium mb-2 truncate'>
                    {item.jobId?.title || 'Role'}
                  </p>
                  <div className='text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg space-y-1'>
                    <p>📅 Date: <strong>{item.date}</strong></p>
                    <p>🕒 Time: <strong>{item.time}</strong></p>
                    {item.note && <p className='italic text-slate-400 break-words'>"{item.note}"</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule / Edit Interview Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4'>
          <div className='bg-[#0f172a] border border-slate-700 text-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-bold'>
                {editingInterview ? 'Edit Interview' : 'Schedule Interview'}
              </h3>
              <button
                onClick={closeInterviewModal}
                className='text-slate-400 hover:text-white text-xl font-bold cursor-pointer'
              >
                ×
              </button>
            </div>
            <p className='text-xs text-slate-400 mb-4'>
              Candidate: <strong className='text-slate-200'>{modalCandidateName || 'Candidate'}</strong> • Role: <strong className='text-slate-200'>{modalRoleTitle || 'Role'}</strong>
            </p>

            <form onSubmit={handleSaveInterview} className='space-y-4'>
              <div>
                <label className='block text-xs font-medium text-slate-300 mb-1'>Date</label>
                <input
                  type='date'
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className='w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500'
                  required
                />
              </div>
              <div>
                <label className='block text-xs font-medium text-slate-300 mb-1'>Time</label>
                <input
                  type='time'
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className='w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500'
                  required
                />
              </div>
              <div>
                <label className='block text-xs font-medium text-slate-300 mb-1'>Meeting Link / Note (Optional)</label>
                <textarea
                  rows={3}
                  value={interviewNote}
                  onChange={(e) => setInterviewNote(e.target.value)}
                  placeholder='e.g. Google Meet link or interview round details...'
                  className='w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500'
                />
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={closeInterviewModal}
                  className='px-4 py-2 text-sm border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={scheduling}
                  className='px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 cursor-pointer'
                >
                  {scheduling
                    ? (editingInterview ? 'Updating...' : 'Scheduling...')
                    : (editingInterview ? 'Update Interview' : 'Confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewApplications;