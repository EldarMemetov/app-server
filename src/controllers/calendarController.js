// import CalendarEvent from '../db/models/CalendarEvent.js';
// import createHttpError from 'http-errors';

// const berlinTodayDateOnly = () =>
//   new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
// // ✅ Создание события вручную
// export const createEventController = async (req, res, next) => {
//   try {
//     const { title, description, date, participants = [] } = req.body;
//     const userId = req.user._id;

//     if (!date) return next(createHttpError(400, 'Date is required'));

//     const parsed = new Date(date);
//     if (Number.isNaN(parsed.getTime())) {
//       return next(createHttpError(400, 'Invalid date'));
//     }

//     const parsedStr = parsed.toISOString().slice(0, 10);
//     const berlinTodayStr = berlinTodayDateOnly();
//     if (parsedStr < berlinTodayStr) {
//       return next(createHttpError(400, 'Date cannot be in the past'));
//     }

//     const uniq = Array.from(
//       new Set([String(userId), ...(participants || []).map((p) => String(p))]),
//     );

//     const event = await CalendarEvent.create({
//       title,
//       description,
//       date: parsed,
//       participants: uniq,
//       createdBy: userId,
//     });

//     const populated = await CalendarEvent.findById(event._id).populate(
//       'participants',
//       'name surname email role',
//     );

//     res.status(201).json({
//       status: 201,
//       message: 'Event created successfully',
//       data: populated,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// export const getUserEventsController = async (req, res) => {
//   const userId = req.user._id;
//   const now = new Date();
//   const showExpired = req.query.showExpired === 'true';

//   await CalendarEvent.updateMany(
//     { participants: userId, date: { $lt: now }, expired: false },
//     { $set: { expired: true } },
//   );

//   const query = { participants: userId };
//   if (!showExpired) {
//     query.expired = false;
//   }

//   const events = await CalendarEvent.find(query)
//     .populate('participants', 'name surname email role')
//     .sort({ date: 1 });

//   res.json({
//     status: 200,
//     message: 'Events fetched successfully',
//     count: events.length,
//     data: events,
//   });
// };

// // ✏️ Обновить событие
// export const updateEventController = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user._id;
//     const { title, description, date, participants } = req.body;

//     const event = await CalendarEvent.findById(id);
//     if (!event) return next(createHttpError(404, 'Event not found'));

//     if (event.createdBy.toString() !== userId.toString()) {
//       return next(createHttpError(403, 'You can edit only your own events'));
//     }

//     if (title !== undefined) event.title = title;
//     if (description !== undefined) event.description = description;

//     if (date !== undefined) {
//       const parsed = new Date(date);
//       if (Number.isNaN(parsed.getTime())) {
//         return next(createHttpError(400, 'Invalid date'));
//       }

//       const parsedStr = parsed.toISOString().slice(0, 10);
//       const berlinTodayStr = new Date().toLocaleDateString('en-CA', {
//         timeZone: 'Europe/Berlin',
//       });
//       if (parsedStr < berlinTodayStr) {
//         return next(createHttpError(400, 'Date cannot be in the past'));
//       }
//       event.date = parsed;
//     }

//     if (participants !== undefined) {
//       event.participants = Array.from(
//         new Set((participants || []).map((p) => String(p))),
//       );
//     }

//     await event.save();

//     const populated = await CalendarEvent.findById(event._id).populate(
//       'participants',
//       'name surname email role',
//     );

//     res.json({
//       status: 200,
//       message: 'Event updated successfully',
//       data: populated,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // 🗑️ Удалить событие
// export const deleteEventController = async (req, res) => {
//   const { id } = req.params;
//   const userId = req.user._id;

//   const event = await CalendarEvent.findById(id);
//   if (!event) throw createHttpError(404, 'Event not found');

//   if (event.createdBy.toString() !== userId.toString()) {
//     throw createHttpError(403, 'You can delete only your own events');
//   }

//   await event.deleteOne();

//   res.json({
//     status: 200,
//     message: 'Event deleted successfully',
//   });
// };
import CalendarEvent from '../db/models/CalendarEvent.js';
import createHttpError from 'http-errors';

const berlinTodayDateOnly = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });

// ✅ Создание события вручную
export const createEventController = async (req, res, next) => {
  try {
    const { title, description, date, participants = [] } = req.body;
    const userId = req.user._id;

    if (!date) return next(createHttpError(400, 'Date is required'));

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return next(createHttpError(400, 'Invalid date'));
    }

    const parsedStr = parsed.toISOString().slice(0, 10);
    const berlinTodayStr = berlinTodayDateOnly();
    if (parsedStr < berlinTodayStr) {
      return next(createHttpError(400, 'Date cannot be in the past'));
    }

    const uniq = Array.from(
      new Set([String(userId), ...(participants || []).map((p) => String(p))]),
    );

    const event = await CalendarEvent.create({
      title,
      description,
      date: parsed,
      participants: uniq,
      createdBy: userId,
    });

    const populated = await CalendarEvent.findById(event._id)
      .populate('participants', 'name surname email role photo')
      .populate('createdBy', 'name surname email role photo')
      .populate({
        path: 'post',
        populate: {
          path: 'author',
          select: 'name surname photo role',
        },
      });

    res.status(201).json({
      status: 201,
      message: 'Event created successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserEventsController = async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const showExpired = req.query.showExpired === 'true';

  await CalendarEvent.updateMany(
    { participants: userId, date: { $lt: now }, expired: false },
    { $set: { expired: true } },
  );

  const query = { participants: userId };
  if (!showExpired) {
    query.expired = false;
  }

  const events = await CalendarEvent.find(query)
    .populate('participants', 'name surname email role photo')
    .populate('createdBy', 'name surname email role photo')
    .populate({
      path: 'post',
      populate: {
        path: 'author',
        select: 'name surname photo role',
      },
    })
    .sort({ date: 1 });

  res.json({
    status: 200,
    message: 'Events fetched successfully',
    count: events.length,
    data: events,
  });
};

// ✏️ Обновить событие
export const updateEventController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { title, description, date, participants } = req.body;

    const event = await CalendarEvent.findById(id);
    if (!event) return next(createHttpError(404, 'Event not found'));

    if (event.createdBy.toString() !== userId.toString()) {
      return next(createHttpError(403, 'You can edit only your own events'));
    }

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;

    if (date !== undefined) {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) {
        return next(createHttpError(400, 'Invalid date'));
      }

      const parsedStr = parsed.toISOString().slice(0, 10);
      const berlinTodayStr = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Europe/Berlin',
      });

      if (parsedStr < berlinTodayStr) {
        return next(createHttpError(400, 'Date cannot be in the past'));
      }

      event.date = parsed;
    }

    if (participants !== undefined) {
      event.participants = Array.from(
        new Set((participants || []).map((p) => String(p))),
      );
    }

    await event.save();

    const populated = await CalendarEvent.findById(event._id)
      .populate('participants', 'name surname email role photo')
      .populate('createdBy', 'name surname email role photo')
      .populate({
        path: 'post',
        populate: {
          path: 'author',
          select: 'name surname photo role',
        },
      });

    res.json({
      status: 200,
      message: 'Event updated successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
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
