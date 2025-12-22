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
import axios from 'axios';
import { env } from './env.js';

export const sendEmail = async ({ to, subject, html }) => {
  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        name: 'App Support',
        email: env('SMTP_FROM'),
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    },
    {
      headers: {
        'api-key': env('BREVO_API_KEY'),
        'Content-Type': 'application/json',
      },
    },
  );
};
