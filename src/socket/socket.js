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

      await UserCollection.findByIdAndUpdate(userId, {
        $inc: { onlineConnections: 1 },
        $set: { onlineStatus: true },
      });

      io.emit('userStatusUpdate', { userId, onlineStatus: true });

      socket.on('disconnect', async () => {
        const updatedUser = await UserCollection.findByIdAndUpdate(
          userId,
          { $inc: { onlineConnections: -1 } },
          { new: true },
        );

        let status = true;
        if (!updatedUser || updatedUser.onlineConnections <= 0) {
          await UserCollection.findByIdAndUpdate(userId, {
            onlineConnections: 0,
            onlineStatus: false,
          });
          status = false;
        }

        io.emit('userStatusUpdate', { userId, onlineStatus: status });
      });
    } catch (err) {
      console.error('Socket error:', err);
      socket.disconnect();
    }
  });
};
