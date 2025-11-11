import * as authServices from '../contacts/auth.js';
import { resetPassword } from '../contacts/auth.js';
import { generateGoogleOAuthUrl } from '../utils/googleOAuth.js';
import { signup } from '../contacts/auth.js';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';
import { refreshTokenLifetime } from '../constants/users.js';
// const setupSession = (res, session) => {
//   res.cookie('refreshToken', session.refreshToken, {
//     httpOnly: true,
//     expire: new Date(Date.now() + session.refreshTokenValidUntil),
//   });

//   res.cookie('sessionId', session._id, {
//     httpOnly: true,
//     expire: new Date(Date.now() + session.refreshTokenValidUntil),
//   });
// };

const setupSession = (res, session) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refreshToken', session.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(Date.now() + refreshTokenLifetime),
  });

  res.cookie('sessionId', session._id, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(Date.now() + refreshTokenLifetime),
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

export const signinController = async (req, res) => {
  const session = await authServices.signin(req.body);

  setupSession(res, session);

  res.json({
    status: 200,
    message: 'Successfully signin',
    data: {
      accessToken: session.accessToken,
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
    },
  });
};

export const signoutController = async (req, res) => {
  const { sessionId } = req.cookies;

  if (sessionId) {
    await authServices.signout(sessionId);
  }

  res.clearCookie('sessionId');
  res.clearCookie('refreshToken');

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
