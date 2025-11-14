import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import {
  getUserNotifications,
  markNotificationRead,
} from '../contacts/postNotifications.js';
const notificationsRouter = Router();

notificationsRouter.get('/', authenticate, ctrlWrapper(getUserNotifications));

notificationsRouter.patch(
  '/:id/read',
  authenticate,
  ctrlWrapper(markNotificationRead),
);

export default notificationsRouter;
