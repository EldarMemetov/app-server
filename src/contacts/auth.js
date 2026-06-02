import bcrypt from 'bcryptjs';
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
import * as authServices from '../contacts/auth.js';
import {
  accessTokenLifetime,
  refreshTokenLifetime,
  verificationTokenLifetime,
  resendVerificationCooldownMs,
} from '../constants/users.js';
import { validateCode } from '../utils/googleOAuth.js';

const sendVerificationEmail = async (user) => {
  const verifyToken = jwt.sign(
    { sub: user._id, email: user.email },
    env('JWT_SECRET'),
    { expiresIn: verificationTokenLifetime },
  );

  const verifyTemplatePath = path.join(TEMPLATES_DIR, 'verify-email.html');
  const templateSource = (await fs.readFile(verifyTemplatePath)).toString();
  const template = handlebars.compile(templateSource);

  const html = template({
    name: user.name,
    link: `${env('APP_DOMAIN')}/verify-email?token=${verifyToken}`,
  });

  await sendEmail({
    from: env('SMTP_FROM'),
    to: user.email,
    subject: 'Confirm your email',
    html,
  });

  await UserCollection.updateOne(
    { _id: user._id },
    { lastVerificationEmailSentAt: new Date() },
  );
};

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
  const {
    email,
    password,
    name,
    surname,
    country,
    city,
    roles: incomingRoles,
    role,
    agreedToPolicy,
  } = payload || {};

  if (!email || !password || !name || !surname || !country || !city) {
    throw createHttpError(
      400,
      'Missing required fields: email, password, name, surname, country, city are required',
    );
  }

  if (agreedToPolicy !== true) {
    throw createHttpError(400, 'You must agree to the privacy policy');
  }

  let roles = [];
  if (Array.isArray(incomingRoles) && incomingRoles.length > 0)
    roles = incomingRoles;
  else if (role) roles = Array.isArray(role) ? role : [role];

  if (!roles || roles.length === 0) {
    throw createHttpError(400, 'At least one role is required');
  }

  const existing = await UserCollection.findOne({ email }).lean();
  if (existing) throw createHttpError(409, 'Email already exist');

  const hashPassword = await bcrypt.hash(password, 10);

  try {
    const created = await UserCollection.create({
      ...payload,
      password: hashPassword,
      roles,
      agreedToPolicy: true,
      agreedToPolicyAt: new Date(),
      verify: false,
    });

    try {
      await sendVerificationEmail(created);
    } catch (mailErr) {
      console.error('Failed to send verification email:', mailErr);
    }

    const userObj = created.toObject ? created.toObject() : created;
    delete userObj.password;
    return userObj;
  } catch (err) {
    if (err && err.code === 11000)
      throw createHttpError(409, 'Email already exist');
    if (err && err.name === 'ValidationError')
      throw createHttpError(400, err.message);
    throw err;
  }
};

export const authenticate = async (req, res, next) => {
  const authorization = req.get('Authorization');

  if (!authorization) {
    return next(createHttpError(401, 'Authorization header not found'));
  }

  const [bearer, token] = authorization.split(' ');
  if (bearer !== 'Bearer') {
    return next(createHttpError(401, 'Authorization must have Bearer type'));
  }

  const session = await authServices.findSessionByAccessToken(token);

  if (!session) {
    return next(createHttpError(401, 'Session not found'));
  }
  if (new Date() > session.accessTokenValidUntil) {
    return next(createHttpError(401, 'Access token expired'));
  }

  const user = await authServices.findUser({ _id: session.userId });
  if (!user) {
    return next(createHttpError(401, 'User not found'));
  }
  if (user.isDeleted) {
    return next(createHttpError(401, 'Account has been deleted'));
  }
  if (user.isBlocked) {
    return next(createHttpError(403, 'User is blocked'));
  }
  req.user = user;

  next();
};

export const signin = async (payload) => {
  const { email, password } = payload;
  const user = await UserCollection.findOne({ email });
  if (!user) throw createHttpError(401, 'Email or password invalid');

  if (user.isDeleted) {
    throw createHttpError(401, 'Email or password invalid');
  }

  const passwordCompare = await bcrypt.compare(password, user.password);
  if (!passwordCompare) throw createHttpError(401, 'Email or password invalid');

  if (!user.verify) {
    throw createHttpError(403, 'Please verify your email before signing in');
  }

  await SessionCollection.deleteMany({ userId: user._id });

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

export const refreshSession = async ({ refreshToken, sessionId }) => {
  if (!refreshToken || !sessionId) {
    throw createHttpError(401, 'Session not found');
  }

  const refreshTokenHash = hashToken(refreshToken);

  let oldSession = await SessionCollection.findOneAndDelete({
    _id: sessionId,
    refreshToken: refreshTokenHash,
  });

  if (!oldSession) {
    oldSession = await SessionCollection.findOneAndDelete({
      _id: sessionId,
      refreshToken,
    });
    if (!oldSession) {
      throw createHttpError(401, 'Session not found or token reused');
    }
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
  });

  return {
    ...newSessionDoc.toObject(),
    refreshToken: sessionData.refreshToken,
    accessToken: sessionData.accessToken,
    accessTokenValidUntil: sessionData.accessTokenValidUntil,
    refreshTokenValidUntil: sessionData.refreshTokenValidUntil,
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
export const changePassword = async (userId, currentPassword, newPassword) => {
  if (!userId) throw createHttpError(401, 'Not authenticated');
  if (!currentPassword || !newPassword)
    throw createHttpError(400, 'currentPassword and newPassword are required');

  const user = await UserCollection.findById(userId).select('+password');
  if (!user) throw createHttpError(404, 'User not found');

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw createHttpError(401, 'Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 10);
  await UserCollection.updateOne({ _id: userId }, { password: hashed });

  try {
    await SessionCollection.deleteMany({ userId });
  } catch (e) {
    console.warn('Failed to delete sessions after password change', e);
  }

  return true;
};

export const verifyEmail = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, env('JWT_SECRET'));
  } catch (err) {
    throw createHttpError(401, 'Invalid or expired verification token');
  }

  const user = await UserCollection.findOne({
    _id: decoded.sub,
    email: decoded.email,
  });
  if (!user) throw createHttpError(404, 'User not found');

  if (user.verify) {
    return { alreadyVerified: true };
  }

  await UserCollection.updateOne({ _id: user._id }, { verify: true });
  return { alreadyVerified: false };
};

export const resendVerificationEmail = async (email) => {
  if (!email) throw createHttpError(400, 'Email is required');

  const user = await UserCollection.findOne({ email });

  if (!user) return;

  if (user.verify) {
    throw createHttpError(400, 'Email is already verified');
  }

  if (user.lastVerificationEmailSentAt) {
    const diff =
      Date.now() - new Date(user.lastVerificationEmailSentAt).getTime();
    if (diff < resendVerificationCooldownMs) {
      const retryAfterSec = Math.ceil(
        (resendVerificationCooldownMs - diff) / 1000,
      );
      throw createHttpError(
        429,
        `Please wait ${retryAfterSec} seconds before requesting a new verification email`,
      );
    }
  }

  await sendVerificationEmail(user);
};
