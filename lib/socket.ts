'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket && typeof window !== 'undefined') {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket']
    });
  }
  return socket;
}

export function subscribeBusLocationUpdate(callback: (payload: any) => void) {
  const client = getSocket();
  client?.on('bus-location-update', callback);
  return () => {
    client?.off('bus-location-update', callback);
  };
}
