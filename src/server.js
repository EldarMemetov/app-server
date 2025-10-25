import express from 'express';
import logger from './middlewares/logger.js';
import cors from 'cors';
import { env } from './utils/env.js';
import errorHandler from './middlewares/errorHandler.js';
import notFoundHandler from './middlewares/notFoundHandler.js';
import cookieParser from 'cookie-parser';
export const setupServer = () => {
  const app = express();
  app.use(logger);
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  app.use(notFoundHandler);
  app.use(errorHandler);

  const port = Number(env('PORT', 3000));

  app.listen(port, () => console.log('Server running on port 3000'));
};
