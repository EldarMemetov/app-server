import CalendarEvent from '../db/models/CalendarEvent.js';
import createHttpError from 'http-errors';

// ✅ Создание события вручную
export const createEventController = async (req, res) => {
  const { title, description, date, participants = [] } = req.body;
  const userId = req.user._id;

  const event = await CalendarEvent.create({
    title,
    description,
    date,
    participants: [userId, ...participants],
    createdBy: userId,
  });

  res.status(201).json({
    status: 201,
    message: 'Event created successfully',
    data: event,
  });
};

// ✅ Получение всех событий пользователя
export const getUserEventsController = async (req, res) => {
  const userId = req.user._id;

  const events = await CalendarEvent.find({
    participants: userId,
  })
    .populate('participants', 'name surname email role')
    .sort({ date: 1 });

  res.json({
    status: 200,
    message: 'Events fetched successfully',
    count: events.length,
    data: events,
  });
};
// ✏️ Обновить событие
export const updateEventController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { title, description, date, participants } = req.body;

  const event = await CalendarEvent.findById(id);
  if (!event) throw createHttpError(404, 'Event not found');

  if (event.createdBy.toString() !== userId.toString()) {
    throw createHttpError(403, 'You can edit only your own events');
  }

  if (title !== undefined) event.title = title;
  if (description !== undefined) event.description = description;
  if (date !== undefined) event.date = date;
  if (participants !== undefined) event.participants = participants;

  await event.save();

  res.json({
    status: 200,
    message: 'Event updated successfully',
    data: event,
  });
};

// 🗑️ Удалить событие
export const deleteEventController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const event = await CalendarEvent.findById(id);
  if (!event) throw createHttpError(404, 'Event not found');

  if (event.createdBy.toString() !== userId.toString()) {
    throw createHttpError(403, 'You can delete only your own events');
  }

  await event.deleteOne();

  res.json({
    status: 200,
    message: 'Event deleted successfully',
  });
};
