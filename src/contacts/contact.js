import createHttpError from 'http-errors';
import { env } from '../utils/env.js';
import { sendEmail } from '../utils/sendEmail.js';

const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const sendContactMessage = async ({ name, email, message }) => {
  const adminEmail = env('ADMIN_EMAIL');
  if (!adminEmail) {
    throw createHttpError(500, 'ADMIN_EMAIL is not configured');
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
      <h2 style="color:#4a6bff;">Нове повідомлення з форми зв'язку</h2>
      <p><b>Ім'я:</b> ${escapeHtml(name)}</p>
      <p><b>Email:</b> ${escapeHtml(email)}</p>
      <p><b>Повідомлення:</b></p>
      <div style="padding:12px 16px;border-left:3px solid #7a5bff;background:#f6f7ff;white-space:pre-wrap;">
        ${escapeHtml(message)}
      </div>
      <p style="color:#888;font-size:12px;margin-top:24px;">
        Відправлено: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  await sendEmail({
    to: adminEmail,
    replyTo: email,
    subject: `[Contact form] ${name}`,
    html,
  });
};
