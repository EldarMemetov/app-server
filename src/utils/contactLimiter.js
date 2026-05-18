import rateLimit from 'express-rate-limit';

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many requests, please try again later.' },
});
