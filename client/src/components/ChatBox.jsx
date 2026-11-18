// src/components/ChatBox.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import { SocketContext } from '../context/SocketContext';
import { assets } from '../assets/assets';

const QUICK_REPLIES_APPLICANT = [
  "Thanks! When can we schedule the interview?",
  "I'm available this week for a call.",
  "Could you share more details about the role?"
];

const QUICK_REPLIES_RECRUITER = [
  "Are you available for a quick call tomorrow?",
  "Please share your preferred time slots.",
  "We'd love to move forward with your next round!"
];

const QUICK_EMOJIS = ['👍', '🎉', '🙏', '📅', '✅', '👋', '✨', '🤝'];

const formatTime = (timestamp) => {
  if (!timestamp) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (timestamp) => {
  if (!timestamp) return 'Today';
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ChatBox({ chatId, currentUserId, isRecruiter = false, onMobileBack }) {
  const { backendUrl, companyToken } = useContext(AppContext);
  const { socket, onlineUserIds } = useContext(SocketContext);
  const { getToken } = useAuth();

  const [messages, setMessages] = useState([]);
  const [chatParticipants, setChatParticipants] = useState({ applicantId: '', recruiterId: '' });
  const [jobInfo, setJobInfo] = useState({ id: '', title: 'Hiring Discussion', location: '' });
  const [applicantInfo, setApplicantInfo] = useState(null);
  const [recruiterInfo, setRecruiterInfo] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojis, setShowEmojis] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  const getAuthHeaders = async () => {
    if (isRecruiter) {
      const token = companyToken || localStorage.getItem('companyToken');
      return token ? { token } : {};
    }
    const clerkToken = await getToken();
    return clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {};
  };

  const fetchMessages = async (isInitial = false) => {
    if (!chatId || !backendUrl) return;
    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.get(`${backendUrl}/api/chat/${chatId}`, { headers });
      if (data.success && data.chat) {
        if (Array.isArray(data.chat.messages)) {
          setMessages(data.chat.messages);
        }
        setChatParticipants({
          applicantId: String(data.chat.applicantId || ''),
          recruiterId: String(data.chat.recruiterId || ''),
        });
        if (data.chat.jobId) {
          setJobInfo({
            id: data.chat.jobId._id || '',
            title: data.chat.jobId.title || 'Hiring Discussion',
            location: data.chat.jobId.location || '',
          });
        }
        if (data.applicant) setApplicantInfo(data.applicant);
        if (data.recruiter) setRecruiterInfo(data.recruiter);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setPeerTyping(false);
    prevMessageCountRef.current = 0;
    fetchMessages(true);
  }, [chatId, backendUrl]);

  // Real-time Socket.io room subscription & typing listeners
  useEffect(() => {
    if (!socket || !chatId) return;

    socket.emit('join_chat', chatId);

    const onReceiveMessage = ({ chatId: incomingChatId, message }) => {
      if (String(incomingChatId) !== String(chatId) || !message) return;
      setMessages((prev) => {
        if (prev.some((m) => String(m._id) === String(message._id))) return prev;
        return [...prev, message];
      });
      setPeerTyping(false);
    };

    const onUserTyping = ({ chatId: incomingChatId, userId }) => {
      if (String(incomingChatId) === String(chatId) && String(userId) !== String(currentUserId)) {
        setPeerTyping(true);
      }
    };

    const onUserStopTyping = ({ chatId: incomingChatId, userId }) => {
      if (String(incomingChatId) === String(chatId) && String(userId) !== String(currentUserId)) {
        setPeerTyping(false);
      }
    };

    socket.on('receive_message', onReceiveMessage);
    socket.on('user_typing', onUserTyping);
    socket.on('user_stop_typing', onUserStopTyping);

    return () => {
      socket.emit('leave_chat', chatId);
      socket.off('receive_message', onReceiveMessage);
      socket.off('user_typing', onUserTyping);
      socket.off('user_stop_typing', onUserStopTyping);
    };
  }, [socket, chatId, currentUserId]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: prevMessageCountRef.current === 0 ? 'auto' : 'smooth',
      });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, peerTyping]);

  const effectiveSenderId = isRecruiter
    ? String(chatParticipants.recruiterId || currentUserId)
    : String(chatParticipants.applicantId || currentUserId);

  const peerId = isRecruiter ? chatParticipants.applicantId : chatParticipants.recruiterId;
  const isPeerOnline = onlineUserIds.includes(String(peerId));

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!socket || !chatId) return;

    socket.emit('typing', { chatId, userId: effectiveSenderId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { chatId, userId: effectiveSenderId });
    }, 1500);
  };

  const sendMessage = async (e, customText = null) => {
    if (e) e.preventDefault();
    const content = (customText ?? text).trim();
    if (!content || sending) return;

    if (!customText) setText('');
    setShowEmojis(false);
    setSending(true);

    if (socket && chatId) {
      socket.emit('stop_typing', { chatId, userId: effectiveSenderId });
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      sender: effectiveSenderId,
      text: content,
      timestamp: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const headers = await getAuthHeaders();
      const { data } = await axios.post(
        `${backendUrl}/api/chat/message`,
        { chatId, text: content },
        { headers }
      );

      if (data.success && data.message) {
        setMessages((prev) => {
          const withoutDuplicate = prev.filter((m) => String(m._id) !== String(data.message._id));
          return withoutDuplicate.map((m) => (m._id === tempId ? data.message : m));
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const otherPerson = isRecruiter
    ? {
        name: applicantInfo?.name || 'Applicant',
        email: applicantInfo?.email || '',
        image: applicantInfo?.image || assets.profile_icon,
        resume: applicantInfo?.resume || '',
      }
    : {
        name: recruiterInfo?.name || 'Recruiter',
        email: recruiterInfo?.email || '',
        image: recruiterInfo?.image || assets.company_icon,
        resume: '',
      };

  const quickReplies = isRecruiter ? QUICK_REPLIES_RECRUITER : QUICK_REPLIES_APPLICANT;

  return (
    <div className="flex flex-col h-[calc(100dvh-88px)] md:h-full max-h-[780px] bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onMobileBack && (
            <button
              type="button"
              onClick={onMobileBack}
              className="md:hidden w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 cursor-pointer shrink-0"
              title="Back to inbox"
            >
              ←
            </button>
          )}

          <div className="relative shrink-0">
            <img
              src={otherPerson.image}
              alt={otherPerson.name}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover bg-white border border-zinc-200 dark:border-zinc-700"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                isPeerOnline ? 'bg-emerald-500' : 'bg-zinc-400'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white truncate">
                {otherPerson.name}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 shrink-0">
                {jobInfo.title}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {peerTyping ? (
                <span className="text-violet-600 dark:text-violet-400 font-semibold animate-pulse">
                  typing...
                </span>
              ) : isPeerOnline ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">● Online</span>
              ) : (
                otherPerson.email || jobInfo.location || 'Offline'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRecruiter && otherPerson.resume && (
            <a
              href={otherPerson.resume}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-3.5 py-2 rounded-xl transition"
            >
              Resume ↗
            </a>
          )}
          {!isRecruiter && jobInfo.id && (
            <Link
              to={`/apply-job/${jobInfo.id}`}
              className="text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-3.5 py-2 rounded-xl transition"
            >
              Job Post ↗
            </Link>
          )}
        </div>
      </div>

      {/* Conversation Feed */}
      <div
        ref={messagesContainerRef}
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 0.85px, transparent 0.85px)',
          backgroundSize: '18px 18px',
        }}
        className="flex-1 overflow-y-auto px-4 sm:px-7 py-5 space-y-2 bg-zinc-50/60 dark:bg-zinc-950/60"
      >
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-4 py-1.5 rounded-full shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            Conversation started for <strong className="text-zinc-800 dark:text-zinc-200">{jobInfo.title}</strong>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-400">
            <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading thread...</p>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg, index) => {
            const isMe = String(msg.sender) === effectiveSenderId;
            const currentDateLabel = formatDateLabel(msg.timestamp);
            const prevDateLabel = index > 0 ? formatDateLabel(messages[index - 1].timestamp) : null;
            const showDateDivider = currentDateLabel !== prevDateLabel;

            return (
              <React.Fragment key={msg._id || index}>
                {showDateDivider && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-zinc-200/80 dark:bg-zinc-800" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      {currentDateLabel}
                    </span>
                    <div className="flex-1 h-px bg-zinc-200/80 dark:bg-zinc-800" />
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-2`}>
                  <div
                    className={`max-w-[82%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-zinc-900 dark:bg-violet-600 text-white rounded-br-xs shadow-md shadow-zinc-900/10'
                        : 'bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-zinc-400">
                    <span>{formatTime(msg.timestamp)}</span>
                    {isMe && (
                      <span className={msg.pending ? 'text-zinc-400' : 'text-violet-600 dark:text-violet-400 font-semibold'}>
                        {msg.pending ? '• Sending' : '• Delivered'}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-6 py-5 rounded-2xl shadow-2xs max-w-xs">
              <p className="text-sm font-semibold text-zinc-800 dark:text-white">
                Break the ice with {otherPerson.name}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Use a prompt below or write a message.
              </p>
            </div>
          </div>
        )}

        {peerTyping && (
          <div className="flex items-start my-2">
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-xs bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-xs text-zinc-500">
              {otherPerson.name} is typing...
            </div>
          </div>
        )}
      </div>

      {/* Emoji Drawer */}
      {showEmojis && (
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setText((prev) => `${prev}${emoji}`)}
              className="text-lg hover:scale-125 transition cursor-pointer px-1.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Suggested Prompts */}
      <div className="px-4 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto">
        {quickReplies.map((reply, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => sendMessage(null, reply)}
            disabled={sending}
            className="shrink-0 text-xs font-medium bg-zinc-100 hover:bg-violet-50 dark:bg-zinc-800 dark:hover:bg-violet-950/60 text-zinc-700 dark:text-zinc-300 hover:text-violet-700 border border-transparent hover:border-violet-200 dark:hover:border-violet-800 px-3 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={sendMessage}
        className="p-3 sm:p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200/70 dark:border-zinc-800 shrink-0"
      >
        <div className="flex items-end gap-2 bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700 focus-within:border-violet-500 focus-within:bg-white dark:focus-within:bg-zinc-900 rounded-2xl p-1.5 transition">
          <button
            type="button"
            onClick={() => setShowEmojis((prev) => !prev)}
            title="Insert emoji"
            className="h-9 w-9 rounded-xl hover:bg-zinc-200/70 dark:hover:bg-zinc-700 flex items-center justify-center text-lg shrink-0 transition cursor-pointer"
          >
            😊
          </button>

          <textarea
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={`Write to ${otherPerson.name}...`}
            className="flex-1 min-w-0 max-h-28 resize-none bg-transparent py-2 px-1 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 outline-none"
          />

          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="h-9 px-4 rounded-xl bg-zinc-900 hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <span>Send</span>
            <span>↑</span>
          </button>
        </div>
      </form>
    </div>
  );
}