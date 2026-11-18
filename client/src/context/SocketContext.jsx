import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useUser } from '@clerk/clerk-react';
import { AppContext } from './AppContext';

export const SocketContext = createContext({ socket: null, onlineUserIds: [] });

export const SocketProvider = ({ children }) => {
  const { backendUrl, companyData } = useContext(AppContext);
  const { user } = useUser();
  const [socket, setSocket] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  const activeUserId = companyData?._id || user?.id || '';

  useEffect(() => {
    if (!backendUrl) return;

    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);

    newSocket.on('online_users', (ids) => {
      setOnlineUserIds(Array.isArray(ids) ? ids.map(String) : []);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [backendUrl]);

  useEffect(() => {
    if (socket && activeUserId) {
      socket.emit('register_user', String(activeUserId));
    }
  }, [socket, activeUserId]);

  return (
    <SocketContext.Provider value={{ socket, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
};
