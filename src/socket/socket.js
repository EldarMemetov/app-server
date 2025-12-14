// import UserCollection from '../db/models/User.js';
// import SessionCollection from '../db/models/Session.js';

// export const initSocket = (io) => {
//   io.on('connection', async (socket) => {
//     try {
//       const token = socket.handshake.auth?.token;
//       if (!token) return socket.disconnect();

//       const session = await SessionCollection.findOne({ accessToken: token });
//       if (!session) return socket.disconnect();

//       const userId = session.userId.toString();
//       socket.userId = userId;

//       await UserCollection.findByIdAndUpdate(userId, {
//         $inc: { onlineConnections: 1 },
//         $set: { onlineStatus: true },
//       });

//       io.emit('userStatusUpdate', { userId, onlineStatus: true });

//       socket.on('disconnect', async () => {
//         const updatedUser = await UserCollection.findByIdAndUpdate(
//           userId,
//           { $inc: { onlineConnections: -1 } },
//           { new: true },
//         );

//         let status = true;
//         if (!updatedUser || updatedUser.onlineConnections <= 0) {
//           await UserCollection.findByIdAndUpdate(userId, {
//             onlineConnections: 0,
//             onlineStatus: false,
//           });
//           status = false;
//         }

//         io.emit('userStatusUpdate', { userId, onlineStatus: status });
//       });
//     } catch (err) {
//       console.error('Socket error:', err);
//       socket.disconnect();
//     }
//   });
// };

// src/socket/socket.js
import UserCollection from '../db/models/User.js';
import SessionCollection from '../db/models/Session.js';

export const initSocket = (io) => {
  io.on('connection', async (socket) => {
    // 1️⃣ СРАЗУ при входящем соединении
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

      // 2️⃣ ПОСЛЕ успешной валидации пользователя
      console.log('[socket] user connected', userId, 'socket=', socket.id);

      await UserCollection.findByIdAndUpdate(
        userId,
        { $inc: { onlineConnections: 1 }, $set: { onlineStatus: true } },
        { new: true },
      );

      const onlineUsers = await UserCollection.find({ onlineStatus: true })
        .select('_id')
        .lean();

      const onlineMap = {};
      for (const u of onlineUsers) {
        onlineMap[u._id.toString()] = true;
      }

      socket.emit('initialUsersStatus', onlineMap);
      io.emit('userStatusUpdate', { userId, onlineStatus: true });

      socket.on('disconnect', async (reason) => {
        try {
          const updatedUser = await UserCollection.findByIdAndUpdate(
            userId,
            { $inc: { onlineConnections: -1 } },
            { new: true },
          );

          let status = true;
          if (!updatedUser || updatedUser.onlineConnections <= 0) {
            await UserCollection.findByIdAndUpdate(userId, {
              $set: { onlineConnections: 0, onlineStatus: false },
            });
            status = false;
          }

          // 3️⃣ ПРИ отключении
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
