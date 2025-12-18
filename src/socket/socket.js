// import UserCollection from '../db/models/User.js';
// import SessionCollection from '../db/models/Session.js';

// export const initSocket = (io) => {
//   io.on('connection', async (socket) => {
//     console.log('[socket] incoming connection, socket.id =', socket.id);

//     try {
//       const token = socket.handshake.auth?.token;
//       if (!token) {
//         console.log('[socket] no token, disconnect socket=', socket.id);
//         return socket.disconnect();
//       }

//       const session = await SessionCollection.findOne({ accessToken: token });
//       if (!session) {
//         console.log('[socket] invalid session, disconnect socket=', socket.id);
//         return socket.disconnect();
//       }

//       const userId = session.userId.toString();
//       socket.userId = userId;

//       console.log('[socket] user connected', userId, 'socket=', socket.id);

//       await UserCollection.findByIdAndUpdate(
//         userId,
//         {
//           $inc: { onlineConnections: 1 },
//           $set: { onlineStatus: true },
//         },
//         { new: true },
//       );

//       const onlineUsers = await UserCollection.find({
//         onlineConnections: { $gt: 0 },
//       })
//         .select('_id')
//         .lean();

//       const onlineMap = {};
//       for (const u of onlineUsers) {
//         onlineMap[u._id.toString()] = true;
//       }

//       socket.emit('initialUsersStatus', onlineMap);

//       io.emit('userStatusUpdate', { userId, onlineStatus: true });

//       socket.on('disconnect', async (reason) => {
//         try {
//           const updatedUser = await UserCollection.findByIdAndUpdate(
//             userId,
//             { $inc: { onlineConnections: -1 } },
//             { new: true },
//           );

//           const connections = Math.max(updatedUser?.onlineConnections ?? 0, 0);
//           const status = connections > 0;

//           await UserCollection.findByIdAndUpdate(userId, {
//             $set: { onlineConnections: connections, onlineStatus: status },
//           });

//           console.log(
//             '[socket] user disconnected',
//             userId,
//             'status=',
//             status,
//             'socket=',
//             socket.id,
//             'reason=',
//             reason,
//           );

//           io.emit('userStatusUpdate', { userId, onlineStatus: status });
//         } catch (err) {
//           console.error('[socket] disconnect handler error', err);
//         }
//       });
//     } catch (err) {
//       console.error('[socket] connection error', err);
//       socket.disconnect();
//     }
//   });
// };
// socket.js
import UserCollection from '../db/models/User.js';
import SessionCollection from '../db/models/Session.js';

export const initSocket = (io) => {
  io.userSockets = new Map();

  io.on('connection', async (socket) => {
    console.log('[socket] incoming connection, socket.id =', socket.id);

    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        console.log('[socket] no token, disconnect socket=', socket.id);
        return socket.disconnect();
      }

      const session = await SessionCollection.findOne({ accessToken: token });
      if (!session) {
        console.log('[socket] invalid session, disconnect socket=', socket.id);
        return socket.disconnect();
      }

      const userId = session.userId.toString();
      socket.userId = userId;

      if (!io.userSockets.has(userId)) io.userSockets.set(userId, new Set());
      io.userSockets.get(userId).add(socket);

      console.log('[socket] user connected', userId, 'socket=', socket.id);

      await UserCollection.findByIdAndUpdate(
        userId,
        { $inc: { onlineConnections: 1 }, $set: { onlineStatus: true } },
        { new: true },
      );

      const onlineUsers = await UserCollection.find({
        onlineConnections: { $gt: 0 },
      })
        .select('_id')
        .lean();

      const onlineMap = {};
      for (const u of onlineUsers) onlineMap[u._id.toString()] = true;

      socket.emit('initialUsersStatus', onlineMap);

      io.emit('userStatusUpdate', { userId, onlineStatus: true });

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

          io.emit('userStatusUpdate', { userId, onlineStatus: status });
        } catch (err) {
          console.error('[socket] disconnect handler error', err);
        }
      });
    } catch (err) {
      console.error('[socket] connection error', err);
      socket.disconnect();
    }
  });
};
