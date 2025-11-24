import pinoHttp from 'pino-http';
import { env } from '../utils/env.js';

const isProduction = env('NODE_ENV', 'development') === 'production';

const logger = pinoHttp({
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true },
      },
});

export default logger;
