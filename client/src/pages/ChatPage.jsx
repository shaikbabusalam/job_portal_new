// src/pages/ChatPage.jsx
import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import ChatBox from '../components/ChatBox';
import Navbar from '../components/Navbar';
import { AppContext } from '../context/AppContext';
import { SocketContext } from '../context/SocketContext';
import { assets } from '../assets/assets';

const formatListTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function ChatPage() {
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { companyData, companyToken, userData, backendUrl } = useContext(AppContext);
  const { socket, onlineUserIds } = useContext(SocketContext);
  const navigate = useNavigate();

  const [threads, setThreads] = useState([]);
  const [threadsLoaded, setThreadsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const roleParam = searchParams.get('role');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [chatId]);

  const isRecruiter =
    roleParam === 'recruiter'
      ? true
      : roleParam === 'applicant'
        ? false
        : Boolean(companyData?._id && !user?.id);

  const currentUserId = isRecruiter ? companyData?._id : user?.id;
  const activeName = isRecruiter
    ? companyData?.name
    : userData?.name || user?.fullName || user?.firstName;
  const myAvatar = isRecruiter
    ? companyData?.image || assets.company_icon
    : userData?.image || user?.imageUrl || assets.profile_icon;

  const getAuthHeaders = async () => {
    if (isRecruiter) {
      const token = companyToken || localStorage.getItem('companyToken');
      return token ? { token } : {};
    }
    const clerkToken = await getToken();
    return clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {};
  };

  const loadThreads = async () => {
    if (!currentUserId || !backendUrl) return;
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.get(`${backendUrl}/api/chat/user/${currentUserId}`, {
        headers,
      });
      if (data.success) {
        setThreads(data.chats || []);
      }
    } catch (err) {
      console.error('Failed to load chat threads:', err);
    } finally {
      setThreadsLoaded(true);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [currentUserId, backendUrl, chatId]);

  useEffect(() => {
    if (!socket) return;
    const handleIncoming = () => loadThreads();
    socket.on('receive_message', handleIncoming);
    return () => socket.off('receive_message', handleIncoming);
  }, [socket, currentUserId, chatId]);

  const filteredThreads = threads.filter((t) => {
    const matchesRole = isRecruiter
      ? String(t.recruiterId) === String(currentUserId)
      : String(t.applicantId) === String(currentUserId);
    if (!matchesRole) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const personName = isRecruiter ? t.applicant?.name : t.recruiter?.name;
    const jobTitle = t.jobId?.title;
    return (
      (personName || '').toLowerCase().includes(q) ||
      (jobTitle || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const isDesktop = window.innerWidth >= 768;
    if (!chatId && threadsLoaded && filteredThreads.length > 0 && isDesktop) {
      navigate(`/chat/${filteredThreads[0]._id}?role=${isRecruiter ? 'recruiter' : 'applicant'}`, {
        replace: true,
      });
    }
  }, [chatId, threadsLoaded, filteredThreads, isRecruiter, navigate]);

  if (!isLoaded && !companyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-4">
          {isRecruiter
            ? 'Please sign in as a recruiter to open your inbox.'
            : 'Please sign in as an applicant to open your inbox.'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const handleSelectThread = (targetChatId) => {
    navigate(`/chat/${targetChatId}?role=${isRecruiter ? 'recruiter' : 'applicant'}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-100/80 dark:bg-zinc-950">
      {!isRecruiter && <Navbar />}

      <div className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 py-3 sm:py-6 flex flex-col">
        <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[calc(100dvh-88px)] md:min-h-[620px] md:max-h-[780px]">
          
          {/* Left Directory Sidebar */}
          <aside
            className={`${
              chatId ? 'hidden md:flex' : 'flex'
            } md:col-span-4 lg:col-span-4 flex-col bg-zinc-50/70 dark:bg-zinc-900/95 border-r border-zinc-200/80 dark:border-zinc-800`}
          >
            <div className="p-4 sm:p-5 border-b border-zinc-200/70 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => navigate(isRecruiter ? '/dashboard/view-applications' : '/applications')}
                    title="Back"
                    className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:border-violet-500 hover:text-violet-600 transition cursor-pointer shrink-0"
                  >
                    ←
                  </button>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                      Inbox
                    </h1>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {activeName} • <span className="text-violet-600 dark:text-violet-400 font-medium">{isRecruiter ? 'Recruiter' : 'Candidate'}</span>
                    </p>
                  </div>
                </div>

                <img
                  src={myAvatar}
                  alt={activeName}
                  className="w-9 h-9 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 bg-white shrink-0"
                />
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter conversations..."
                  className="w-full bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition"
                />
                <svg
                  className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {filteredThreads.length > 0 ? (
                filteredThreads.map((thread) => {
                  const isActive = String(thread._id) === String(chatId);
                  const peer = isRecruiter ? thread.applicant : thread.recruiter;
                  const peerId = isRecruiter ? thread.applicantId : thread.recruiterId;
                  const isPeerOnline = onlineUserIds.includes(String(peerId));
                  const peerName = peer?.name || (isRecruiter ? 'Applicant' : 'Recruiter');
                  const peerImg =
                    peer?.image || (isRecruiter ? assets.profile_icon : assets.company_icon);
                  const lastMessageObj = thread.messages?.[thread.messages.length - 1];
                  const lastMsg =
                    lastMessageObj?.text || 'Application accepted — say hello!';
                  const lastTime = formatListTime(lastMessageObj?.timestamp || thread.updatedAt);
                  const unread = isActive ? 0 : thread.unreadCount || 0;

                  return (
                    <button
                      key={thread._id}
                      type="button"
                      onClick={() => handleSelectThread(thread._id)}
                      className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-zinc-900 dark:bg-violet-600 text-white shadow-md'
                          : 'hover:bg-white dark:hover:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={peerImg}
                          alt={peerName}
                          className="w-11 h-11 rounded-xl object-cover bg-white border border-zinc-200/60"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                            isPeerOnline ? 'bg-emerald-400' : 'bg-zinc-400'
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{peerName}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {unread > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-violet-600 text-white">
                                {unread}
                              </span>
                            )}
                            <span
                              className={`text-[10px] ${
                                isActive ? 'text-zinc-300' : 'text-zinc-400'
                              }`}
                            >
                              {lastTime}
                            </span>
                          </div>
                        </div>

                        <p
                          className={`text-[11px] font-medium truncate mt-0.5 ${
                            isActive
                              ? 'text-violet-300 dark:text-violet-100'
                              : 'text-violet-600 dark:text-violet-400'
                          }`}
                        >
                          {thread.jobId?.title || 'Job Opening'}
                        </p>

                        <p
                          className={`text-xs truncate mt-1 ${
                            isActive
                              ? 'text-zinc-300 dark:text-violet-100/80'
                              : unread > 0
                                ? 'font-semibold text-zinc-900 dark:text-white'
                                : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {lastMsg}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    No conversations
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Accepted applications will appear here.
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* Right Conversation Canvas */}
          <main
            className={`${
              chatId ? 'flex' : 'hidden md:flex'
            } md:col-span-8 flex-col bg-white dark:bg-zinc-900`}
          >
            {chatId ? (
              <ChatBox
                chatId={chatId}
                currentUserId={currentUserId}
                isRecruiter={isRecruiter}
                onMobileBack={() =>
                  navigate(`/chat?role=${isRecruiter ? 'recruiter' : 'applicant'}`)
                }
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/40 dark:bg-zinc-950/40">
                <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center text-3xl mb-4 shadow-xs">
                  ✦
                </div>
                <h2 className="text-xl font-bold text-zinc-800 dark:text-white">
                  Select a Conversation
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-2">
                  Choose any thread from your inbox on the left to start messaging.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}