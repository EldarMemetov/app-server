import { Router } from 'express';

import validateBody from '../utils/validateBody.js';
import { contactMessageSchema } from '../validation/contact.js';

import { contactLimiter } from '../utils/contactLimiter.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import { sendContactMessageController } from '../controllers/contact.js';

const router = Router();

router.post(
  '/',
  contactLimiter,
  validateBody(contactMessageSchema),
  ctrlWrapper(sendContactMessageController),
);

export default router;
