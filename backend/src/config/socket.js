const { Server } = require('socket.io');
const { initLiveTracking } = require('../socket/liveTracking');

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  initLiveTracking(io);
  return io;
}

module.exports = { createSocketServer };
