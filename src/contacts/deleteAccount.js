import bcrypt from 'bcryptjs';
import createHttpError from 'http-errors';

import UserCollection from '../db/models/User.js';
import SessionCollection from '../db/models/Session.js';
import PostCollection from '../db/models/Post.js';
import CommentCollection from '../db/models/Comment.js';
import ReviewCollection from '../db/models/Review.js';
import NotificationCollection from '../db/models/Notification.js';
import FavoriteCollection from '../db/models/Favorite.js';
import CalendarEventCollection from '../db/models/CalendarEvent.js';

import { deleteFromCloudinary } from '../utils/saveFileToCloudinary.js';

const cleanupCloudinaryAssets = async (user) => {
  // Аватар
  if (user.photoPublicId) {
    try {
      await deleteFromCloudinary(user.photoPublicId);
    } catch (e) {
      console.warn('avatar del', e);
    }
  }

  // heroMedia
  for (const item of user.heroMedia || []) {
    if (item.public_id) {
      try {
        await deleteFromCloudinary(
          item.public_id,
          item.type === 'video' ? 'video' : 'image',
        );
      } catch (e) {
        console.warn('hero del', e);
      }
    }
  }

  // Медиа из постов юзера
  try {
    const posts = await PostCollection.find({ author: user._id })
      .select('media')
      .lean();
    for (const p of posts) {
      for (const m of p.media || []) {
        if (m.public_id) {
          try {
            await deleteFromCloudinary(
              m.public_id,
              m.type === 'video' ? 'video' : 'image',
            );
          } catch (e) {
            console.warn('post media del', e);
          }
        }
      }
    }
  } catch (e) {
    console.warn('cleanup post media failed', e);
  }
};

export const deleteAccount = async (userId, currentPassword) => {
  if (!userId) throw createHttpError(401, 'Not authenticated');
  if (!currentPassword) throw createHttpError(400, 'Password is required');

  const user = await UserCollection.findById(userId).select('+password');
  if (!user) throw createHttpError(404, 'User not found');
  if (user.isDeleted) throw createHttpError(400, 'Account already deleted');

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) throw createHttpError(401, 'Current password is incorrect');

  const uid = user._id;

  // 1) Cloudinary
  await cleanupCloudinaryAssets(user);

  // 2) Анонимизируем посты юзера + чистим медиа
  await PostCollection.updateMany(
    { author: uid },
    { $set: { authorDeleted: true, media: [] } },
  );

  // 3) Комменты — используем встроенные поля `deleted` / `status`
  await CommentCollection.updateMany(
    { author: uid },
    { $set: { deleted: true, status: 'hidden', text: '[deleted user]' } },
  );

  // 4) Отзывы юзера — анонимизируем (чужая репутация остаётся)
  await ReviewCollection.updateMany(
    { author: uid },
    { $set: { authorDeleted: true } },
  );

  // 5) Удаляем личные данные
  await Promise.allSettled([
    NotificationCollection.deleteMany({ user: uid }),
    NotificationCollection.deleteMany({ fromUser: uid }),
    FavoriteCollection.deleteMany({ userId: uid }),
    FavoriteCollection.deleteMany({ targetType: 'user', targetId: uid }),
    CalendarEventCollection.deleteMany({ createdBy: uid }),
    CalendarEventCollection.updateMany(
      { participants: uid },
      { $pull: { participants: uid } },
    ),
  ]);

  // 6) Чистим ссылки на юзера в чужих постах
  await PostCollection.updateMany(
    {
      $or: [
        { assignedTo: uid },
        { favorites: uid },
        { interestedUsers: uid },
        { 'roleSlots.assigned': uid },
      ],
    },
    {
      $pull: {
        assignedTo: uid,
        favorites: uid,
        interestedUsers: uid,
        'roleSlots.$[].assigned': uid,
      },
    },
  );

  // 7) Анонимизируем User (GDPR)
  const anonEmail = `deleted_${uid.toString()}@qvrix.local`;
  await UserCollection.updateOne(
    { _id: uid },
    {
      $set: {
        email: anonEmail,
        name: 'Deleted',
        surname: 'User',
        photo: '',
        photoPublicId: '',
        aboutMe: '',
        experience: '',
        country: '—',
        city: '—',
        languages: [],
        directions: [],
        heroType: null,
        heroMedia: [],
        socialLinks: {
          telegram: '',
          whatsapp: '',
          instagram: '',
          facebook: '',
          linkedin: '',
          website: '',
        },
        onlineStatus: false,
        onlineConnections: 0,
        isDeleted: true,
        isBlocked: true,
        deletedAt: new Date(),
      },
    },
  );

  await SessionCollection.deleteMany({ userId: uid });

  return true;
};
