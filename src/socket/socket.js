import UserCollection from '../db/models/User.js';
import SessionCollection from '../db/models/Session.js';

export const initSocket = (io) => {
  io.userSockets = new Map();

  io.sendToUser = (userId, event, payload) => {
    try {
      if (!userId) return false;
      const set = io.userSockets.get(String(userId));
      if (!set || set.size === 0) return false;
      for (const s of set) {
        try {
          s.emit(event, payload);
        } catch (e) {
          console.warn('[io.sendToUser] emit error', e);
        }
      }
      return true;
    } catch (e) {
      console.error('[io.sendToUser] unexpected error', e);
      return false;
    }
  };

  io.broadcastUserStatus = (userId, onlineStatus) => {
    const payload = {
      userId: String(userId),
      onlineStatus: Boolean(onlineStatus),
    };

    try {
      io.emit('userStatusUpdate', payload);
    } catch (e) {
      console.error('[io.broadcastUserStatus] emit error', e);
    }
  };

  io.on('connection', async (socket) => {
    console.log('[socket] incoming connection, socket.id =', socket.id);

    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        console.log(
          '[socket] no token provided — disconnecting socket=',
          socket.id,
        );
        return socket.disconnect();
      }

      const session = await SessionCollection.findOne({
        accessToken: token,
      }).lean();
      if (!session) {
        console.log(
          '[socket] invalid session — disconnecting socket=',
          socket.id,
        );
        return socket.disconnect();
      }

      const userId = String(session.userId);
      socket.userId = userId;

      if (!io.userSockets.has(userId)) io.userSockets.set(userId, new Set());
      io.userSockets.get(userId).add(socket);

      console.log('[socket] user connected', userId, 'socket=', socket.id);

      try {
        await UserCollection.findByIdAndUpdate(
          userId,
          { $inc: { onlineConnections: 1 }, $set: { onlineStatus: true } },
          { new: true },
        );
      } catch (e) {
        console.error(
          '[socket] failed to update user online state on connect',
          e,
        );
      }

      try {
        const onlineUsers = await UserCollection.find({
          onlineConnections: { $gt: 0 },
        })
          .select('_id')
          .lean();

        const onlineMap = {};
        for (const u of onlineUsers) onlineMap[String(u._id)] = true;

        socket.emit('initialUsersStatus', onlineMap);
      } catch (e) {
        console.error('[socket] failed to build initialUsersStatus', e);

        socket.emit('initialUsersStatus', {});
      }

      io.broadcastUserStatus(userId, true);

      socket.on('disconnect', async (reason) => {
        try {
          const set = io.userSockets.get(userId);
          if (set) {
            set.delete(socket);
            if (set.size === 0) io.userSockets.delete(userId);
          }

          const updatedUser = await UserCollection.findByIdAndUpdate(
            userId,
            { $inc: { onlineConnections: -1 } },
            { new: true },
          );

          const connections = Math.max(updatedUser?.onlineConnections ?? 0, 0);
          const status = connections > 0;

          await UserCollection.findByIdAndUpdate(userId, {
            $set: { onlineConnections: connections, onlineStatus: status },
          });

          console.log(
            '[socket] user disconnected',
            userId,
            'status=',
            status,
            'socket=',
            socket.id,
            'reason=',
            reason,
          );

          io.broadcastUserStatus(userId, status);
        } catch (err) {
          console.error('[socket] disconnect handler error', err);
        }
      });
    } catch (err) {
      console.error('[socket] connection error', err);
      try {
        socket.disconnect();
      } catch (e) {
        console.log(e);
      }
    }
  });
};
