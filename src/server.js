import express from 'express';

import cors from 'cors';

import { env } from './utils/env.js';

import notFoundHandler from './middlewares/notFoundHandler.js';

import errorHandler from './middlewares/errorHandler.js';

import logger from './middlewares/logger.js';

import authRouter from './routers/auth.js';
import portfolioRouter from './routers/portfolioRouter.js';

import cookieParser from 'cookie-parser';
import profileRouter from './routers/profileRouter.js';
import postsRouter from './routers/postsRouter.js';
import moderatorRouter from './routers/moderatorRouter.js';
export const setupServer = () => {
  const app = express();

  app.use(logger);
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  app.use('/auth', authRouter);
  app.use('/profile', profileRouter);
  app.use('/posts', postsRouter);
  app.use('/moderation', moderatorRouter);
  app.use('/portfolio', portfolioRouter);
  app.use(notFoundHandler);

  app.use(errorHandler);

  const port = Number(env('PORT', 3000));

  app.listen(port, () => console.log('Server running on port 3000'));
};
