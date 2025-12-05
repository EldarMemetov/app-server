import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import createHttpError from 'http-errors';
import UserCollection from '../db/models/User.js';
import SessionCollection from '../db/models/Session.js';
import { hashToken } from '../utils/hashToken.js';
import jwt from 'jsonwebtoken';
import { TEMPLATES_DIR } from '../constants/index.js';
import { env } from '../utils/env.js';
import { sendEmail } from '../utils/sendEmail.js';
import handlebars from 'handlebars';
import path from 'node:path';
import fs from 'node:fs/promises';

import {
  accessTokenLifetime,
  refreshTokenLifetime,
} from '../constants/users.js';
import { validateCode } from '../utils/googleOAuth.js';

const createSession = () => {
  const accessToken = randomBytes(30).toString('base64');
  const refreshToken = randomBytes(30).toString('base64');

  const accessTokenValidUntil = new Date(Date.now() + accessTokenLifetime);
  const refreshTokenValidUntil = new Date(Date.now() + refreshTokenLifetime);

  return {
    accessToken,
    refreshToken,
    accessTokenValidUntil,
    refreshTokenValidUntil,
  };
};

export const signup = async (payload) => {
  const { email, password } = payload;
  const user = await UserCollection.findOne({ email });
  if (user) {
    throw createHttpError(409, 'Email already exist');
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const data = await UserCollection.create({
    ...payload,
    password: hashPassword,
  });
  delete data._doc.password;
  return data._doc;
};

// export const signin = async (payload) => {
//   const { email, password } = payload;
//   const user = await UserCollection.findOne({ email });
//   if (!user) {
//     throw createHttpError(401, 'Email or password invalid');
//   }

//   const passwordCompare = await bcrypt.compare(password, user.password);
//   if (!passwordCompare) {
//     throw createHttpError(401, 'Email or password invalid');
//   }

//   await SessionCollection.deleteMany({ userId: user._id });

//   const sessionData = createSession();

//   const sessionDoc = await SessionCollection.create({
//     userId: user._id,
//     accessToken: sessionData.accessToken,
//     refreshToken: hashToken(sessionData.refreshToken), // хэш
//     accessTokenValidUntil: sessionData.accessTokenValidUntil,
//     refreshTokenValidUntil: sessionData.refreshTokenValidUntil,
//   });

//   return {
//     ...sessionDoc.toObject(),

//     refreshToken: sessionData.refreshToken,
//     accessToken: sessionData.accessToken,
//     accessTokenValidUntil: sessionData.accessTokenValidUntil,
//     refreshTokenValidUntil: sessionData.refreshTokenValidUntil,
//   };
// };
export const signin = async (payload, meta = {}) => {
  const { email, password } = payload;

  const user = await UserCollection.findOne({ email });
  if (!user) throw createHttpError(401, 'Email or password invalid');

  const passwordCompare = await bcrypt.compare(password, user.password);
  if (!passwordCompare) throw createHttpError(401, 'Email or password invalid');

  const sessionData = createSession();

  const sessionDoc = await SessionCollection.create({
    userId: user._id,
    accessToken: sessionData.accessToken,
    refreshToken: hashToken(sessionData.refreshToken),
    accessTokenValidUntil: sessionData.accessTokenValidUntil,
    refreshTokenValidUntil: sessionData.refreshTokenValidUntil,

    ip: meta.ip,
    userAgent: meta.userAgent,
    device: meta.device,
  });

  return {
    ...sessionDoc.toObject(),
    refreshToken: sessionData.refreshToken,
    accessToken: sessionData.accessToken,
  };
};

export const signinOrSignupWitGoogleOAuth = async (code) => {
  const loginTicket = await validateCode(code);
  const payload = loginTicket.getPayload();

  let user = await UserCollection.findOne({ email: payload.email });
  if (!user) {
    const password = randomBytes(10);
    const hashPassword = await bcrypt.hash(password, 10);
    user = await UserCollection.create({
      email: payload.email,
      name: payload.name,
      password: hashPassword,
      verify: true,
    });
    delete user._doc.password;
  }

  const sessionData = createSession();

  const sessionDoc = await SessionCollection.create({
    userId: user._id,
    accessToken: sessionData.accessToken,
    refreshToken: hashToken(sessionData.refreshToken),
    accessTokenValidUntil: sessionData.accessTokenValidUntil,
    refreshTokenValidUntil: sessionData.refreshTokenValidUntil,
  });

  return {
    ...sessionDoc.toObject(),
    refreshToken: sessionData.refreshToken,
    accessToken: sessionData.accessToken,
    accessTokenValidUntil: sessionData.accessTokenValidUntil,
    refreshTokenValidUntil: sessionData.refreshTokenValidUntil,
  };
};

export const findSessionByAccessToken = (accessToken) =>
  SessionCollection.findOne({ accessToken });

// export const refreshSession = async ({ refreshToken, sessionId }) => {
//   if (!refreshToken || !sessionId) {
//     throw createHttpError(401, 'Session not found');
//   }

//   const refreshTokenHash = hashToken(refreshToken);

//   let oldSession = await SessionCollection.findOneAndDelete({
//     _id: sessionId,
//     refreshToken: refreshTokenHash,
//   });

//   if (!oldSession) {
//     oldSession = await SessionCollection.findOneAndDelete({
//       _id: sessionId,
//       refreshToken,
//     });
//     if (!oldSession) {
//       throw createHttpError(401, 'Session not found or token reused');
//     }
//   }

//   if (new Date() > oldSession.refreshTokenValidUntil) {
//     throw createHttpError(401, 'Session token expired');
//   }

//   const sessionData = createSession();

//   const newSessionDoc = await SessionCollection.create({
//     userId: oldSession.userId,
//     accessToken: sessionData.accessToken,
//     refreshToken: hashToken(sessionData.refreshToken),
//     accessTokenValidUntil: sessionData.accessTokenValidUntil,
//     refreshTokenValidUntil: sessionData.refreshTokenValidUntil,
//   });

//   return {
//     ...newSessionDoc.toObject(),
//     refreshToken: sessionData.refreshToken,
//     accessToken: sessionData.accessToken,
//     accessTokenValidUntil: sessionData.accessTokenValidUntil,
//     refreshTokenValidUntil: sessionData.refreshTokenValidUntil,
//   };
// };
export const refreshSession = async ({ refreshToken, sessionId }) => {
  if (!refreshToken || !sessionId) {
    throw createHttpError(401, 'Session not found');
  }

  const refreshTokenHash = hashToken(refreshToken);

  const oldSession = await SessionCollection.findOneAndDelete({
    _id: sessionId,
    refreshToken: refreshTokenHash,
    revoked: { $ne: true },
  });

  if (!oldSession) {
    throw createHttpError(401, 'Session not found or token reused');
  }

  if (new Date() > oldSession.refreshTokenValidUntil) {
    throw createHttpError(401, 'Session token expired');
  }

  const sessionData = createSession();

  const newSessionDoc = await SessionCollection.create({
    userId: oldSession.userId,
    accessToken: sessionData.accessToken,
    refreshToken: hashToken(sessionData.refreshToken),
    accessTokenValidUntil: sessionData.accessTokenValidUntil,
    refreshTokenValidUntil: sessionData.refreshTokenValidUntil,

    ip: oldSession.ip,
    userAgent: oldSession.userAgent,
    device: oldSession.device,
  });

  return {
    ...newSessionDoc.toObject(),
    refreshToken: sessionData.refreshToken,
    accessToken: sessionData.accessToken,
  };
};

export const signout = async (sessionId) => {
  await SessionCollection.deleteOne({ _id: sessionId });
};

export const findUser = (filter) => UserCollection.findOne(filter);

export const requestResetToken = async (email) => {
  const user = await UserCollection.findOne({ email });
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const resetToken = jwt.sign(
    {
      sub: user._id,
      email,
    },
    env('JWT_SECRET'),
    { expiresIn: '15m' },
  );

  const resetPasswordTemplatePath = path.join(
    TEMPLATES_DIR,
    'reset-password-email.html',
  );
  const templateSource = (
    await fs.readFile(resetPasswordTemplatePath)
  ).toString();
  const template = handlebars.compile(templateSource);

  const html = template({
    name: user.name,
    link: `${env('APP_DOMAIN')}/reset-password?token=${resetToken}`,
  });

  await sendEmail({
    from: env('SMTP_FROM'),
    to: email,
    subject: 'Reset your password',
    html,
  });
};

export const resetPassword = async (payload) => {
  let decodedToken;

  try {
    decodedToken = jwt.verify(payload.token, env('JWT_SECRET'));
  } catch (err) {
    if (err instanceof Error)
      throw createHttpError(401, 'Invalid or expired token');
    throw err;
  }

  const user = await UserCollection.findOne({
    email: decodedToken.email,
    _id: decodedToken.sub,
  });

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const encryptedPassword = await bcrypt.hash(payload.password, 10);

  await UserCollection.updateOne(
    { _id: user._id },
    { password: encryptedPassword },
  );
};
