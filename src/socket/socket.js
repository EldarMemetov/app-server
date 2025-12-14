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
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return socket.disconnect();

      const session = await SessionCollection.findOne({ accessToken: token });
      if (!session) return socket.disconnect();

      const userId = session.userId.toString();
      socket.userId = userId;

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

      socket.on('disconnect', async () => {
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

          io.emit('userStatusUpdate', { userId, onlineStatus: status });
        } catch (err) {
          console.error('disconnect handler error', err);
        }
      });
    } catch (err) {
      console.error('Socket connection error:', err);
      socket.disconnect();
    }
  });
};
