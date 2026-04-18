import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import { env } from './utils/env.js';

import logger from './middlewares/logger.js';
import notFoundHandler from './middlewares/notFoundHandler.js';
import errorHandler from './middlewares/errorHandler.js';

import authRouter from './routers/auth.js';
import profileRouter from './routers/profileRouter.js';
import postsRouter from './routers/postsRouter.js';
import moderatorRouter from './routers/moderatorRouter.js';
import portfolioRouter from './routers/portfolioRouter.js';
import locationRouter from './routers/locationRouter.js';
import notificationsRouter from './routers/notificationsRouter.js';
import favoritesRouter from './routers/favorites.js';
import profilePublicRouter from './routers/profilePublicRouter.js';
import reviewsRouter from './routers/reviews.js';
import corsOptions from './utils/corsOptions.js';
import { initSocket } from './socket/socket.js';
import { updateAllPostsStatus } from './services/postStatusService.js';
import calendarRouter from './routers/calendarRouter.js';
export const setupServer = () => {
  const app = express();
  const port = Number(env('PORT', 3000));

  app.use(helmet());
  app.use(logger);
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/', (req, res) => {
    res.send({
      message: 'Qvrix API is running 🚀',
      status: 'OK',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/auth', authRouter);
  app.use('/profile', profileRouter);
  app.use('/people', profilePublicRouter);
  app.use('/posts', postsRouter);
  app.use('/moderation', moderatorRouter);
  app.use('/portfolio', portfolioRouter);
  app.use('/location', locationRouter);
  app.use('/notifications', notificationsRouter);
  app.use('/favorites', favoritesRouter);
  app.use('/calendar', calendarRouter);
  app.use('/', reviewsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  app.set('io', io);

  initSocket(io);

  server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);

    setInterval(
      async () => {
        try {
          const updatedCount = await updateAllPostsStatus();
          if (updatedCount > 0) {
            console.log(`✅ Checked all posts, updated ${updatedCount} posts`);
          }
        } catch (err) {
          console.error('❌ Error updating posts status:', err);
        }
      },
      60 * 60 * 1000,
    );
  });

  return app;
};
