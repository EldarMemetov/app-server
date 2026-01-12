import CalendarEvent from '../db/models/CalendarEvent.js';
import Notification from '../db/models/Notification.js';
import UserCollection from '../db/models/User.js';
import createHttpError from 'http-errors';
import PostCollection from '../db/models/Post.js';
import { createNotification } from '../utils/notifications.js';
import Application from '../db/models/Application.js';
/// ✅ Подать заявку на пост

// export const applyToPostController = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const io = req.app?.get('io');
//     const userId = req.user._id;
//     const { appliedRole, message } = req.body;

//     const post = await PostCollection.findById(id);
//     if (!post) return next(createHttpError(404, 'Post not found'));
//     if (post.status !== 'open')
//       return next(
//         createHttpError(400, 'Applications are closed for this post'),
//       );

//     const slot = (post.roleSlots || []).find((s) => s.role === appliedRole);
//     if (!slot) {
//       return next(
//         createHttpError(
//           400,
//           `This post is not looking for role "${appliedRole}"`,
//         ),
//       );
//     }

//     const existing = await Application.findOne({ post: id, user: userId });
//     if (existing) {
//       return next(createHttpError(400, 'You already applied to this post'));
//     }

//     const application = await Application.create({
//       post: id,
//       user: userId,
//       appliedRole,
//       message: message || '',
//     });

//     await PostCollection.findByIdAndUpdate(id, {
//       $inc: { applicationsCount: 1 },
//     });

//     const notification = await createNotification({
//       user: post.author,
//       fromUser: userId,
//       type: 'post',
//       key: 'new_application',
//       title: 'New application for your post',
//       message: `${req.user.name} applied as ${appliedRole} for "${post.title}"`,
//       relatedPost: post._id,
//       meta: {
//         applicantId: userId,
//         appliedRole,
//         postId: post._id,
//       },
//       unique: true,
//       uniqueMetaKeys: ['applicantId', 'postId'],
//     });
//     if (io) {
//       io.sendToUser(post.author, 'notification:new', notification);
//     }
//     res.status(201).json({
//       status: 201,
//       message: 'Application submitted successfully',
//       data: application,
//     });
//   } catch (err) {
//     next(err);
//   }
// };
export const applyToPostController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const io = req.app?.get('io');
    const userId = req.user._id;
    const { appliedRole, message } = req.body;

    const post = await PostCollection.findById(id);
    if (!post) return next(createHttpError(404, 'Post not found'));
    if (post.status !== 'open')
      return next(
        createHttpError(400, 'Applications are closed for this post'),
      );

    if (String(post.author) === String(userId)) {
      return next(createHttpError(403, 'You cannot apply to your own post'));
    }

    const slot = (post.roleSlots || []).find((s) => s.role === appliedRole);
    if (!slot) {
      return next(
        createHttpError(
          400,
          `This post is not looking for role "${appliedRole}"`,
        ),
      );
    }

    let userRoles = [];
    if (Array.isArray(req.user?.roles)) userRoles = req.user.roles;
    else if (req.user?.role) userRoles = [req.user.role];
    else {
      const u = await UserCollection.findById(userId)
        .select('role roles')
        .lean();
      if (u)
        userRoles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [];
    }
    userRoles = (userRoles || []).map(String);

    if (!userRoles.includes(String(appliedRole))) {
      return next(createHttpError(403, 'You can apply only to your own role'));
    }

    const existing = await Application.findOne({ post: id, user: userId });
    if (existing) {
      return next(createHttpError(400, 'You already applied to this post'));
    }

    const application = await Application.create({
      post: id,
      user: userId,
      appliedRole,
      message: message || '',
    });

    await PostCollection.findByIdAndUpdate(id, {
      $inc: { applicationsCount: 1 },
    });

    const notification = await createNotification({
      user: post.author,
      fromUser: userId,
      type: 'post',
      key: 'new_application',
      title: 'New application for your post',
      message: `${req.user.name || 'User'} applied as ${appliedRole} for "${
        post.title
      }"`,
      relatedPost: post._id,
      meta: {
        applicantId: userId,
        appliedRole,
        postId: post._id,
      },
      unique: true,
      uniqueMetaKeys: ['applicantId', 'postId'],
    });

    if (io) {
      try {
        io.sendToUser(post.author, 'notification:new', notification);
      } catch (e) {
        console.warn('[applyToPost] socket send warning', e);
      }
    }

    res.status(201).json({
      status: 201,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Назначить кандидата
export const assignCandidateController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const io = req.app?.get('io');
    const { assignments } = req.body;
    const currentUserId = req.user._id;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return next(createHttpError(400, 'Assignments are required'));
    }

    const post = await PostCollection.findById(id);
    if (!post) return next(createHttpError(404, 'Post not found'));
    if (post.author.toString() !== currentUserId.toString()) {
      return next(
        createHttpError(403, 'Only the post author can assign candidates'),
      );
    }
    if (post.status !== 'open') {
      return next(createHttpError(400, 'Post is not open for assignment'));
    }

    if (!post.date) {
      return next(
        createHttpError(
          400,
          'Post date is required before assigning candidates',
        ),
      );
    }

    const slotMap = {};
    (post.roleSlots || []).forEach((s) => {
      slotMap[s.role] = {
        required: Number(s.required) || 0,
        assigned: Array.isArray(s.assigned) ? s.assigned.map(String) : [],
      };
    });

    const userIds = assignments.map((a) => String(a.userId));
    const apps = await Application.find({ post: id, user: { $in: userIds } });

    const invalid = [];
    for (const a of assignments) {
      const app = apps.find((x) => x.user.toString() === String(a.userId));
      if (!app || app.appliedRole !== a.role) {
        invalid.push(`${a.userId} (role ${a.role})`);
      }
    }
    if (invalid.length > 0) {
      return next(
        createHttpError(
          400,
          `These users did not apply for given roles: ${invalid.join(', ')}`,
        ),
      );
    }

    const counts = {};
    for (const [role, val] of Object.entries(slotMap)) {
      counts[role] = val.assigned.length;
    }

    for (const a of assignments) {
      if (!slotMap[a.role]) {
        return next(
          createHttpError(400, `Role ${a.role} is not defined for this post`),
        );
      }
      counts[a.role] = (counts[a.role] || 0) + 1;
      if (counts[a.role] > slotMap[a.role].required) {
        return next(
          createHttpError(
            400,
            `Too many assignees for role ${a.role}. Max ${
              slotMap[a.role].required
            }`,
          ),
        );
      }
    }

    const assignedIds = assignments.map((a) => a.userId);

    await Application.updateMany(
      { post: id, user: { $in: assignedIds } },
      { $set: { status: 'selected' } },
    );
    await Application.updateMany(
      { post: id, user: { $nin: assignedIds }, status: 'applied' },
      { $set: { status: 'rejected' } },
    );

    for (const a of assignments) {
      const slot = post.roleSlots.find((s) => s.role === a.role);
      if (slot) {
        slot.assigned = Array.from(
          new Set([...(slot.assigned || []).map(String), String(a.userId)]),
        );
      }
      post.assignedTo = Array.from(
        new Set([...(post.assignedTo || []).map(String), String(a.userId)]),
      );
    }

    post.status = 'in_progress';
    await post.save();

    const uniqueParticipants = Array.from(
      new Set([post.author.toString(), ...assignedIds.map(String)]),
    );
    await CalendarEvent.findOneAndUpdate(
      { post: post._id },
      {
        title: `Photoshoot: ${post.title}`,
        description: post.description,
        date: post.date,
        participants: uniqueParticipants,
        createdBy: post.author,
      },
      { upsert: true, new: true },
    );

    const reminderDate = new Date(post.date);
    if (!isNaN(reminderDate.getTime())) {
      reminderDate.setDate(reminderDate.getDate() - 1);
    }

    for (const a of assignments) {
      const notification = await createNotification({
        user: a.userId,
        type: 'post',
        key: 'post_assigned',
        title: `You were assigned to post "${post.title}"`,
        message: `You have been assigned as ${a.role} for "${post.title}" in ${post.city}`,
        relatedPost: post._id,
        meta: {
          postId: post._id,
          assignedRole: a.role,
          user: a.userId,
        },
        unique: true,
        uniqueMetaKeys: ['postId', 'assignedRole', 'user'],
      });
      if (io) {
        io.sendToUser(a.userId, 'notification:new', notification);
      }
      if (!isNaN(reminderDate.getTime())) {
        await createNotification({
          user: a.userId,
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
          uniqueMetaKeys: ['postId', 'user', 'date'],
        });
      }
    }

    res.json({
      status: 200,
      message: 'Candidates assigned and events created in calendar',
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

export const completePostController = async (req, res, next) => {
  try {
    const io = req.app?.get('io');
    const { id } = req.params;
    const currentUserId = req.user._id;

    const post = await PostCollection.findById(id);
    if (!post) return next(createHttpError(404, 'Post not found'));

    if (post.author.toString() !== currentUserId.toString()) {
      return next(createHttpError(403, 'Only the post author can complete it'));
    }

    if (post.status !== 'in_progress') {
      return next(createHttpError(400, 'Post is not in progress'));
    }

    post.status = 'completed';
    await post.save();

    if (Array.isArray(post.assignedTo) && post.assignedTo.length > 0) {
      await UserCollection.updateMany(
        { _id: { $in: post.assignedTo } },
        { $inc: { rating: 10 } },
      );

      await Application.updateMany(
        { post: post._id, user: { $in: post.assignedTo } },
        { $set: { status: 'completed' } },
      );

      await UserCollection.findByIdAndUpdate(post.author, {
        $inc: { rating: 5 },
      });

      for (const uid of post.assignedTo) {
        const notification = await createNotification({
          user: uid,
          type: 'post',
          key: 'post_completed',
          title: `Post "${post.title}" completed`,
          message: `The post "${post.title}" in ${post.city} has been completed`,
          relatedPost: post._id,
          meta: { postId: post._id, user: uid },
          unique: true,
          uniqueMetaKeys: ['postId', 'user'],
        });
        if (io) {
          io.sendToUser(uid, 'notification:new', notification);
        }
      }
    }

    res.json({
      status: 200,
      message: 'Post completed and ratings updated',
      data: post,
    });
  } catch (err) {
    next(err);
  }
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
// 💼 Добавить / убрать заинтересованность
export const toggleInterestedController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await PostCollection.findById(id);
    if (!post) return next(createHttpError(404, 'Post not found'));

    const isInterested = (post.interestedUsers || []).some(
      (u) => String(u) === String(userId),
    );

    if (isInterested) {
      post.interestedUsers = (post.interestedUsers || []).filter(
        (u) => String(u) !== String(userId),
      );
    } else {
      post.interestedUsers = Array.from(
        new Set([...(post.interestedUsers || []).map(String), String(userId)]),
      );
    }

    await post.save();

    res.json({
      status: 200,
      message: isInterested
        ? 'Interest removed successfully'
        : 'User marked as interested',
      interestedCount: post.interestedUsers.length,
    });
  } catch (err) {
    next(err);
  }
};
