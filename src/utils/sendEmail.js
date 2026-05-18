// import axios from 'axios';
// import { env } from './env.js';

// export const sendEmail = async ({ to, subject, html }) => {
//   await axios.post(
//     'https://api.brevo.com/v3/smtp/email',
//     {
//       sender: {
//         name: 'App Support',
//         email: env('SMTP_FROM'),
//       },
//       to: [{ email: to }],
//       subject,
//       htmlContent: html,
//     },
//     {
//       headers: {
//         'api-key': env('BREVO_API_KEY'),
//         'Content-Type': 'application/json',
//       },
//     },
//   );
// };
import axios from 'axios';
import { env } from './env.js';

export const sendEmail = async ({ to, subject, html, replyTo, from }) => {
  const payload = {
    sender: {
      name: 'App Support',
      email: from || env('SMTP_FROM'),
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (replyTo) {
    payload.replyTo =
      typeof replyTo === 'string' ? { email: replyTo } : replyTo;
  }

  await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
    headers: {
      'api-key': env('BREVO_API_KEY'),
      'Content-Type': 'application/json',
    },
  });
};
