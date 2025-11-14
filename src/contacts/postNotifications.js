import CalendarEvent from '../db/models/CalendarEvent.js';
import Notification from '../db/models/Notification.js';
import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';
import PostCollection from '../db/models/Post.js';
import { createNotification } from '../utils/notifications.js';
/// ✅ Подать заявку на пост
export const applyToPostController = async (req, res) => {
  const { id } = req.params; // postId
  const userId = req.user._id;
  const { message } = req.body;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');
  if (post.status !== 'open')
    throw createHttpError(400, 'Applications are closed for this post');

  const alreadyApplied = post.candidates.some(
    (c) => c.user.toString() === userId.toString(),
  );
  if (alreadyApplied)
    throw createHttpError(400, 'You already applied to this post');

  post.candidates.push({ user: userId, message });
  await post.save();

  // Создание уведомления с проверкой уникальности по applicantId
  await createNotification({
    user: post.author,
    type: 'post',
    key: 'new_application',
    title: 'New application for your post',
    message: `${req.user.name} applied for your post "${post.title}"`,
    relatedPost: post._id,
    meta: {
      applicantId: userId,
      applicantName: req.user.name,
      applicantSurname: req.user.surname,
      applicantEmail: req.user.email,
      postTitle: post.title,
      postCity: post.city,
    },
    unique: true,
    uniqueMetaKeys: ['applicantId'],
  });

  res.status(201).json({
    status: 201,
    message: 'Application submitted successfully',
    data: post.candidates,
  });
};

// ✅ Назначить кандидата
export const assignCandidateController = async (req, res) => {
  const { id } = req.params;
  const { userIds } = req.body;
  const currentUserId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  if (post.author.toString() !== currentUserId.toString()) {
    throw createHttpError(403, 'Only the post author can assign candidates');
  }

  const invalidUsers = userIds.filter(
    (uid) => !post.candidates.some((c) => c.user.toString() === uid),
  );
  if (invalidUsers.length > 0) {
    throw createHttpError(
      404,
      `These users are not candidates for this post: ${invalidUsers.join(
        ', ',
      )}`,
    );
  }

  post.assignedTo = userIds;
  post.status = 'in_progress';
  await post.save();

  for (const uid of userIds) {
    await CalendarEvent.create({
      title: `Photoshoot: ${post.title}`,
      description: post.description,
      date: post.date,
      post: post._id,
      participants: [uid, post.author],
      createdBy: post.author,
    });

    await createNotification({
      user: uid,
      type: 'post',
      key: 'post_assigned',
      title: `You were assigned to post "${post.title}"`,
      message: `You have been assigned to post "${post.title}" in ${post.city}`,
      relatedPost: post._id,
      meta: {
        postId: post._id,
        postTitle: post.title,
        postCity: post.city,
        authorId: post.author,
        authorName: req.user.name,
      },
      unique: true,
      uniqueMetaKeys: ['postId'],
    });

    // Напоминание за день до съемки
    const reminderDate = new Date(post.date);
    reminderDate.setDate(reminderDate.getDate() - 1);

    await createNotification({
      user: uid,
      type: 'reminder',
      key: 'shooting_reminder',
      title: `Reminder: Photoshoot for "${post.title}"`,
      message: `Reminder: You have a photoshoot for "${
        post.title
      }" on ${post.date.toDateString()}`,
      relatedPost: post._id,
      meta: {
        postId: post._id,
        postTitle: post.title,
        postCity: post.city,
        date: post.date,
      },
      scheduledAt: reminderDate,
      unique: true,
      uniqueMetaKeys: ['postId'],
    });
  }

  res.json({
    status: 200,
    message: 'Candidates assigned and events created in calendar',
    data: post,
  });
};

export const completePostController = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  if (post.author.toString() !== currentUserId.toString()) {
    throw createHttpError(403, 'Only the post author can complete it');
  }

  if (post.status !== 'in_progress') {
    throw createHttpError(400, 'Post is not in progress');
  }

  post.status = 'completed';
  await post.save();

  if (Array.isArray(post.assignedTo) && post.assignedTo.length > 0) {
    // Обновляем рейтинг исполнителей
    await UserCollection.updateMany(
      { _id: { $in: post.assignedTo } },
      { $inc: { rating: 10 } },
    );

    // Обновляем рейтинг автора
    await UserCollection.findByIdAndUpdate(post.author, {
      $inc: { rating: 5 },
    });

    // Уведомления о завершении поста
    for (const uid of post.assignedTo) {
      await createNotification({
        user: uid,
        type: 'post',
        key: 'post_completed',
        title: `Post "${post.title}" completed`,
        message: `The post "${post.title}" in ${post.city} has been completed`,
        relatedPost: post._id,
        meta: {
          postId: post._id,
          postTitle: post.title,
          postCity: post.city,
          authorId: post.author,
        },
        unique: true,
        uniqueMetaKeys: ['postId'],
      });
    }
  }

  res.json({
    status: 200,
    message: 'Post completed and ratings updated',
    data: post,
  });
};

export const getUserNotifications = async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, unread } = req.query;

  const query = { user: userId };
  if (unread === 'true') query.read = false;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Notification.countDocuments(query);

  res.json({
    status: 200,
    data: notifications,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  });
};
export const markNotificationRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { read: true },
    { new: true },
  );

  if (!notification) throw createHttpError(404, 'Notification not found');

  res.json({
    status: 200,
    message: 'Notification marked as read',
    data: notification,
  });
};
