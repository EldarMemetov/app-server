import { Router } from 'express';
import validateBody from '../utils/validateBody.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as authControllers from '../controllers/auth.js';
import {
  userLoginWithGoogleOAuthSchema,
  userSigninSchema,
  resendVerificationSchema,
  userSignupSchema,
} from '../validation/users.js';
import { requestResetEmailSchema } from '../validation/mail.js';
import authenticate from '../middlewares/authenticate.js';

import { changePasswordSchema } from '../validation/auth.js';
import { changePasswordController } from '../controllers/auth.js';
import { resetPasswordSchema } from '../validation/auth.js';

const authRouter = Router();

authRouter.post(
  '/register',
  validateBody(userSignupSchema),
  ctrlWrapper(authControllers.signupController),
);

authRouter.post(
  '/login',
  validateBody(userSigninSchema),
  ctrlWrapper(authControllers.signinController),
);

authRouter.post('/refresh', ctrlWrapper(authControllers.refreshController));

authRouter.post('/logout', ctrlWrapper(authControllers.signoutController));

authRouter.post(
  '/send-reset-email',
  validateBody(requestResetEmailSchema),
  ctrlWrapper(authControllers.requestResetEmailController),
);

authRouter.post(
  '/reset-pwd',
  validateBody(resetPasswordSchema),
  ctrlWrapper(authControllers.resetPasswordController),
);

authRouter.get(
  '/google-oauth-url',
  ctrlWrapper(authControllers.getGoogleOthControllers),
);

authRouter.post(
  '/confirm-google',
  validateBody(userLoginWithGoogleOAuthSchema),
  ctrlWrapper(authControllers.userLoginWithGoogleOAuthControllers),
);
authRouter.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  ctrlWrapper(changePasswordController),
);

authRouter.get(
  '/verify-email',
  ctrlWrapper(authControllers.verifyEmailController),
);

authRouter.post(
  '/verify-email',
  ctrlWrapper(authControllers.verifyEmailController),
);

authRouter.post(
  '/resend-verification',
  validateBody(resendVerificationSchema),
  ctrlWrapper(authControllers.resendVerificationController),
);
export default authRouter;
