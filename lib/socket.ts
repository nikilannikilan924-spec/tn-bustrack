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

    socket.on('connect', () => {
      socket?.emit('watchAll');
    });
  }
  return socket;
}

export function subscribeBusLocationUpdate(callback: (payload: any) => void) {
  const client = getSocket();
  client?.on('currentBuses', callback);
  client?.on('busUpdate', (bus: any) => callback([bus]));
  return () => {
    client?.off('currentBuses', callback);
    client?.off('busUpdate', callback);
  };
}

export function subscribeBusRemoved(callback: (busId: string) => void) {
  const client = getSocket();
  client?.on('busRemoved', callback);
  return () => {
    client?.off('busRemoved', callback);
  };
}
