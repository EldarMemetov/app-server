// import nodemailer from 'nodemailer';

// import { SMTP } from '../constants/index.js';
// import { env } from '../utils/env.js';

// const transporter = nodemailer.createTransport({
//   host: env(SMTP.SMTP_HOST),
//   port: Number(env(SMTP.SMTP_PORT)),
//   auth: {
//     user: env(SMTP.SMTP_USER),
//     pass: env(SMTP.SMTP_PASSWORD),
//   },
// });

// export const sendEmail = async (options) => {
//   return await transporter.sendMail(options);
// };
import nodemailer from 'nodemailer';
import { SMTP } from '../constants/index.js';
import { env } from '../utils/env.js';

const transporter = nodemailer.createTransport({
  host: env(SMTP.SMTP_HOST),
  port: Number(env(SMTP.SMTP_PORT)),
  secure: false,
  requireTLS: true,
  auth: {
    user: env(SMTP.SMTP_USER),
    pass: env(SMTP.SMTP_PASSWORD),
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: env(SMTP.SMTP_FROM),
    to,
    subject,
    html,
  });
};
