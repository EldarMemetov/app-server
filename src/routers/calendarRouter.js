import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import checkBlocked from '../middlewares/checkBlocked.js';
import validateBody from '../utils/validateBody.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import { createEventSchema } from '../validation/calendar.js';
import {
  createEventController,
  getUserEventsController,
  updateEventController,
  deleteEventController,
} from '../controllers/calendarController.js';

const calendarRouter = Router();

// Получить свои события
calendarRouter.get(
  '/',
  authenticate,
  checkBlocked,
  ctrlWrapper(getUserEventsController),
);

// Добавить событие вручную
calendarRouter.post(
  '/',
  authenticate,
  checkBlocked,
  validateBody(createEventSchema),
  ctrlWrapper(createEventController),
);

// ✏️ Обновить событие
calendarRouter.patch(
  '/:id',
  authenticate,
  checkBlocked,
  ctrlWrapper(updateEventController),
);

// 🗑️ Удалить событие
calendarRouter.delete(
  '/:id',
  authenticate,
  checkBlocked,
  ctrlWrapper(deleteEventController),
);

export default calendarRouter;
