import * as authServices from '../contacts/auth.js';
import { resetPassword } from '../contacts/auth.js';
import { generateGoogleOAuthUrl } from '../utils/googleOAuth.js';
import { signup } from '../contacts/auth.js';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';
import SessionCollection from '../db/models/Session.js';
import createHttpError from 'http-errors';

const isProd = process.env.NODE_ENV === 'production';

const setupSession = (res, session) => {
  res.cookie('refreshToken', session.refreshToken, {
    httpOnly: true,
    expires: session.refreshTokenValidUntil,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });

  res.cookie('sessionId', session._id.toString(), {
    httpOnly: true,
    expires: session.refreshTokenValidUntil,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
};

export const signupController = async (req, res) => {
  let photoUrl;

  if (req.file) {
    const result = await saveFileToCloudinary(req.file);
    photoUrl = result.url;
  }

  const newUser = await signup({ ...req.body, photo: photoUrl });

  res.status(201).json({
    status: 201,
    message: 'Successfully register user',
    data: newUser,
  });
};

// export const signinController = async (req, res) => {
//   const session = await authServices.signin(req.body);

//   setupSession(res, session);

//   res.json({
//     status: 200,
//     message: 'Successfully signin',
//     data: {
//       accessToken: session.accessToken,
//       expiresAt: session.accessTokenValidUntil.getTime(),
//     },
//   });
// };
export const signinController = async (req, res) => {
  const meta = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    device: req.body.deviceName || '',
  };

  const session = await authServices.signin(req.body, meta);

  setupSession(res, session);

  res.json({
    status: 200,
    message: 'Successfully signin',
    data: {
      accessToken: session.accessToken,
      expiresAt: session.accessTokenValidUntil.getTime(),
    },
  });
};

export const refreshController = async (req, res) => {
  const { refreshToken, sessionId } = req.cookies;
  const session = await authServices.refreshSession({
    refreshToken,
    sessionId,
  });

  setupSession(res, session);

  res.json({
    status: 200,
    message: 'Successfully refresh session',
    data: {
      accessToken: session.accessToken,
      expiresAt: session.accessTokenValidUntil.getTime(),
    },
  });
};

export const signoutController = async (req, res) => {
  const { sessionId } = req.cookies;

  if (sessionId) {
    await authServices.signout(sessionId);
  }

  const isProd = process.env.NODE_ENV === 'production';

  res.clearCookie('sessionId', {
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  });

  res.clearCookie('refreshToken', {
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  });

  res.status(204).send();
};

export const requestResetEmailController = async (req, res) => {
  const { email } = req.body;

  try {
    await authServices.requestResetToken(email);

    res.json({
      status: 200,
      message: 'Reset password email has been successfully sent.',
      data: {},
    });
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ message: error.message });
    } else {
      console.error('Error sending email:', error);
      res.status(500).json({
        message: 'Failed to send the email, please try again later.',
      });
    }
  }
};

export const resetPasswordController = async (req, res) => {
  await resetPassword(req.body);

  res.json({
    message: 'Password was successfully reset!',
    status: 200,
    data: {},
  });
};

export const getGoogleOthControllers = async (req, res) => {
  const url = generateGoogleOAuthUrl();
  res.json({
    status: 200,
    message: 'Successfully create Google Oauth url',
    data: {
      url,
    },
  });
};

export const userLoginWithGoogleOAuthControllers = async (req, res) => {
  const session = await authServices.signinOrSignupWitGoogleOAuth(
    req.body.code,
  );
  setupSession(res, session);

  res.json({
    status: 200,
    message: 'Successfully login by Google OAuth',
    data: {
      accessToken: session.accessToken,
    },
  });
};
export const getSessionsController = async (req, res) => {
  const sessions = await SessionCollection.find({
    userId: req.user._id,
    revoked: { $ne: true },
  }).select('-refreshToken');

  res.json({
    status: 200,
    message: 'Sessions loaded',
    data: sessions,
  });
};

export const revokeSessionController = async (req, res) => {
  const { id } = req.params;

  const session = await SessionCollection.findOne({
    _id: id,
    userId: req.user._id,
  });

  if (!session) throw createHttpError(404, 'Session not found');

  session.revoked = true;
  await session.save();

  res.json({ status: 200, message: 'Session revoked' });
};
