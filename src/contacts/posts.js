import PostCollection from '../db/models/Post.js';
import Favorite from '../db/models/Favorite.js';
import createHttpError from 'http-errors';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';
import { toggleLike } from './likesGeneric.js';
import { toggleFavorite as toggleFavoriteService } from './favorites.js';
import Comment from '../db/models/Comment.js';
import { roles } from '../constants/roles.js';

const normalizeRoleSlots = (body) => {
  let roleSlots = [];
  if (body.roleSlots) {
    try {
      roleSlots =
        typeof body.roleSlots === 'string'
          ? JSON.parse(body.roleSlots)
          : body.roleSlots;
      if (!Array.isArray(roleSlots)) roleSlots = [];
    } catch {
      roleSlots = [];
    }
  } else if (body.roleNeeded) {
    const arr = Array.isArray(body.roleNeeded)
      ? body.roleNeeded
      : typeof body.roleNeeded === 'string'
      ? body.roleNeeded.split(',')
      : [];
    roleSlots = arr.map((r) => ({ role: r.trim(), required: 1 }));
  }

  roleSlots = roleSlots
    .map((s) => ({
      role: String(s.role).trim(),
      required: Math.max(1, Number(s.required) || 1),
    }))
    .filter((s) => roles.includes(s.role) && s.required > 0);
  return roleSlots;
};
const isDateInPastBerlin = (input) => {
  if (!input) return false;
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) return false;

  const berlinDateStr = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Europe/Berlin',
  });

  const berlinToday = new Date(berlinDateStr);
  const parsedDateOnly = new Date(parsed.toISOString().slice(0, 10));

  return parsedDateOnly < berlinToday;
};

export const createPostWithMediaController = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    if (!userId) return next(createHttpError(401, 'Unauthorized'));

    const {
      title,
      description,
      country,
      city,
      date,
      type,
      price,
      maxAssigned,
    } = req.body;
    if (!title || !description || !country || !city)
      return next(createHttpError(400, 'Missing required fields'));

    const roleSlots = normalizeRoleSlots(req.body);

    if (!Array.isArray(roleSlots) || roleSlots.length === 0) {
      return next(createHttpError(400, 'At least one role must be specified'));
    }

    if (date) {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime()))
        return next(createHttpError(400, 'Invalid date format'));

      if (isDateInPastBerlin(parsed)) {
        return next(createHttpError(400, 'Date cannot be in the past'));
      }
    }

    const postData = {
      author: userId,
      title: String(title).trim(),
      description: String(description),
      country: String(country),
      city: String(city),
      type: type || 'tfp',
      price: Number(price) || 0,
      roleSlots,
      maxAssigned: typeof maxAssigned === 'number' ? maxAssigned : 5,
    };

    if (date) {
      postData.date = new Date(date);
    }

    const newPost = await PostCollection.create(postData);

    if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        return next(createHttpError(400, 'Too many files (max 5)'));
      }

      const uploadedMedia = [];
      try {
        for (const file of req.files) {
          if (
            !file.mimetype.startsWith('image') &&
            !file.mimetype.startsWith('video')
          ) {
            throw createHttpError(400, 'Invalid file type');
          }
          const { url, public_id } = await saveFileToCloudinary(file);
          const mediaType = file.mimetype.startsWith('video')
            ? 'video'
            : 'photo';
          uploadedMedia.push({ type: mediaType, url, public_id });
        }
      } catch (uploadErr) {
        console.error('Upload error:', uploadErr);
        return next(createHttpError(500, 'Failed to upload media'));
      }

      const photos = uploadedMedia.filter((m) => m.type === 'photo').length;
      const videos = uploadedMedia.filter((m) => m.type === 'video').length;
      if (photos > 3)
        return next(createHttpError(400, 'Post can have maximum 3 photos'));
      if (videos > 1)
        return next(createHttpError(400, 'Post can have only 1 video'));

      newPost.media = uploadedMedia;
      await newPost.save();
    }

    res
      .status(201)
      .json({ status: 201, message: 'Post created', data: newPost });
  } catch (err) {
    next(err);
  }
};
export const createPostController = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    if (!userId) return next(createHttpError(401, 'Unauthorized'));

    const {
      title,
      description,
      country,
      city,
      date,
      type,
      price,
      roleNeeded,
      roleSlots: incomingRoleSlots,
      maxAssigned,
    } = req.body;

    if (!title || !description || !country || !city) {
      return next(createHttpError(400, 'Missing required fields'));
    }

    const roleSlots = normalizeRoleSlots({
      roleSlots: incomingRoleSlots,
      roleNeeded,
    });

    if (!Array.isArray(roleSlots) || roleSlots.length === 0) {
      return next(createHttpError(400, 'At least one role must be specified'));
    }

    if (date) {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) {
        return next(createHttpError(400, 'Invalid date format'));
      }
      if (isDateInPastBerlin(parsed)) {
        return next(createHttpError(400, 'Date cannot be in the past'));
      }
    }

    const createData = {
      author: userId,
      title: String(title).trim(),
      description: String(description),
      country: String(country),
      city: String(city),
      type: type || 'tfp',
      price: Number(price) || 0,
      roleSlots,
      maxAssigned: typeof maxAssigned === 'number' ? maxAssigned : 5,
    };

    if (date) {
      createData.date = new Date(date);
    }

    const post = await PostCollection.create(createData);

    res.status(201).json({
      status: 201,
      message: 'Post created successfully',
      data: post,
    });
  } catch (err) {
    next(err);
  }
};
export const updatePostController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await PostCollection.findById(id);
    if (!post) return next(createHttpError(404, 'Post not found'));

    if (post.author.toString() !== userId.toString()) {
      return next(createHttpError(403, 'You can edit only your own posts'));
    }

    const {
      title,
      description,
      country,
      city,
      date,
      type,
      price,
      maxAssigned,
      roleSlots: incomingRoleSlots,
      roleNeeded,
    } = req.body;

    const roleSlots = normalizeRoleSlots({
      roleSlots: incomingRoleSlots,
      roleNeeded,
    });

    if (
      (incomingRoleSlots !== undefined || roleNeeded !== undefined) &&
      (!Array.isArray(roleSlots) || roleSlots.length === 0)
    ) {
      return next(createHttpError(400, 'At least one role must be specified'));
    }

    const updateData = {};

    if (title !== undefined) updateData.title = String(title).trim();
    if (description !== undefined) updateData.description = description;
    if (country !== undefined) updateData.country = country;
    if (city !== undefined) updateData.city = city;
    if (type !== undefined) updateData.type = type;
    if (price !== undefined) updateData.price = Number(price);
    if (maxAssigned !== undefined) updateData.maxAssigned = Number(maxAssigned);
    if (roleSlots && roleSlots.length > 0) updateData.roleSlots = roleSlots;

    if (date !== undefined) {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime()))
        return next(createHttpError(400, 'Invalid date format'));
      if (isDateInPastBerlin(parsed)) {
        return next(createHttpError(400, 'Date cannot be in the past'));
      }
      updateData.date = parsed;
    }

    const updatedPost = await PostCollection.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.json({
      status: 200,
      message: 'Post updated successfully',
      data: updatedPost,
    });
  } catch (err) {
    next(err);
  }
};

// export const createPostWithMediaController = async (req, res, next) => {
//   try {
//     const { _id: userId } = req.user;
//     if (!userId) return next(createHttpError(401, 'Unauthorized'));

//     const {
//       title,
//       description,
//       country,
//       city,
//       date,
//       type,
//       price,
//       maxAssigned,
//     } = req.body;
//     if (!title || !description || !country || !city)
//       return next(createHttpError(400, 'Missing required fields'));

//     const roleSlots = normalizeRoleSlots(req.body);

//     const postData = {
//       author: userId,
//       title: String(title).trim(),
//       description: String(description),
//       country: String(country),
//       city: String(city),
//       type: type || 'tfp',
//       price: Number(price) || 0,
//       roleSlots,
//       maxAssigned: typeof maxAssigned === 'number' ? maxAssigned : 5,
//     };

//     if (date) {
//       const parsed = new Date(date);
//       if (isNaN(parsed.getTime()))
//         return next(createHttpError(400, 'Invalid date format'));
//       postData.date = parsed;
//     }

//     const newPost = await PostCollection.create(postData);

//     if (req.files && req.files.length > 0) {
//       if (req.files.length > 5) {
//         return next(createHttpError(400, 'Too many files (max 5)'));
//       }

//       const uploadedMedia = [];
//       try {
//         for (const file of req.files) {
//           if (
//             !file.mimetype.startsWith('image') &&
//             !file.mimetype.startsWith('video')
//           ) {
//             throw createHttpError(400, 'Invalid file type');
//           }
//           const { url, public_id } = await saveFileToCloudinary(file);
//           const mediaType = file.mimetype.startsWith('video')
//             ? 'video'
//             : 'photo';
//           uploadedMedia.push({ type: mediaType, url, public_id });
//         }
//       } catch (uploadErr) {
//         console.error('Upload error:', uploadErr);
//         return next(createHttpError(500, 'Failed to upload media'));
//       }

//       const photos = uploadedMedia.filter((m) => m.type === 'photo').length;
//       const videos = uploadedMedia.filter((m) => m.type === 'video').length;
//       if (photos > 3)
//         return next(createHttpError(400, 'Post can have maximum 3 photos'));
//       if (videos > 1)
//         return next(createHttpError(400, 'Post can have only 1 video'));

//       newPost.media = uploadedMedia;
//       await newPost.save();
//     }

//     res
//       .status(201)
//       .json({ status: 201, message: 'Post created', data: newPost });
//   } catch (err) {
//     next(err);
//   }
// };

// export const createPostController = async (req, res, next) => {
//   try {
//     const { _id: userId } = req.user;
//     if (!userId) return next(createHttpError(401, 'Unauthorized'));

//     const {
//       title,
//       description,
//       country,
//       city,
//       date,
//       type,
//       price,
//       roleNeeded,
//       roleSlots: incomingRoleSlots,
//       maxAssigned,
//     } = req.body;

//     if (!title || !description || !country || !city) {
//       return next(createHttpError(400, 'Missing required fields'));
//     }

//     const roleSlots = normalizeRoleSlots({
//       roleSlots: incomingRoleSlots,
//       roleNeeded,
//     });

//     const createData = {
//       author: userId,
//       title: String(title).trim(),
//       description: String(description),
//       country: String(country),
//       city: String(city),
//       type: type || 'tfp',
//       price: Number(price) || 0,
//       roleSlots,
//       maxAssigned: typeof maxAssigned === 'number' ? maxAssigned : 5,
//     };

//     if (date) {
//       const parsed = new Date(date);
//       if (Number.isNaN(parsed.getTime())) {
//         return next(createHttpError(400, 'Invalid date format'));
//       }
//       createData.date = parsed;
//     }

//     const post = await PostCollection.create(createData);

//     res.status(201).json({
//       status: 201,
//       message: 'Post created successfully',
//       data: post,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

export const getAllPostsController = async (req, res, next) => {
  try {
    const { roleNeeded, city, type, sortFavorites } = req.query;
    const filter = {};
    if (roleNeeded) filter.roleNeeded = { $in: roleNeeded.split(',') };
    if (city) filter.city = city;
    if (type) filter.type = type;

    const posts = await PostCollection.find(filter)
      .populate('author', 'name surname city role photo')
      .sort({ createdAt: -1 })
      .lean();

    const userId = req.user?._id;
    if (userId && posts.length) {
      const ids = posts.map((p) => p._id);
      const favs = await Favorite.find({
        userId,
        targetType: 'post',
        targetId: { $in: ids },
      })
        .select('targetId')
        .lean();
      const favSet = new Set(favs.map((f) => String(f.targetId)));
      posts.forEach((p) => (p.isFavorited = favSet.has(String(p._id))));

      if (sortFavorites === '1') {
        posts.sort((a, b) => (b.isFavorited ? 1 : 0) - (a.isFavorited ? 1 : 0));
      }
    }

    if (!posts || posts.length === 0) {
      throw createHttpError(404, 'No posts found');
    }

    res.json({
      status: 200,
      message: 'Posts fetched successfully',
      data: posts,
    });
  } catch (err) {
    next(err);
  }
};

export const getPostByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await PostCollection.findById(id)
      .populate('author', 'name surname city photo role')
      .lean();

    if (!post) return next(createHttpError(404, 'Post not found'));

    const comments = await Comment.find({ postId: id, deleted: false })
      .populate('author', 'name surname photo role')
      .sort({ createdAt: -1 })
      .lean();

    post.comments = comments;

    const userId = req.user?._id;
    if (userId) {
      const exists = await Favorite.findOne({
        userId,
        targetType: 'post',
        targetId: id,
      }).lean();
      post.isFavorited = Boolean(exists);
    } else {
      post.isFavorited = false;
    }

    res.json({ status: 200, message: 'Post fetched successfully', data: post });
  } catch (err) {
    next(err);
  }
};
// ✏️ Обновить пост
// export const updatePostController = async (req, res) => {
//   const { id } = req.params;
//   const userId = req.user._id;

//   const post = await PostCollection.findById(id);
//   if (!post) throw createHttpError(404, 'Post not found');

//   if (post.author.toString() !== userId.toString()) {
//     throw createHttpError(403, 'You can edit only your own posts');
//   }

//   const updatedPost = await PostCollection.findByIdAndUpdate(id, req.body, {
//     new: true,
//   });

//   res.json({
//     status: 200,
//     message: 'Post updated successfully',
//     data: updatedPost,
//   });
// };

// 🗑️ Удалить пост
export const deletePostController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  if (post.author.toString() !== userId.toString()) {
    throw createHttpError(403, 'You can delete only your own posts');
  }

  await PostCollection.findByIdAndDelete(id);

  res.json({
    status: 200,
    message: 'Post deleted successfully',
  });
};

export const toggleLikeController = async (req, res, next) => {
  const { id } = req.params;
  const fromUserId = req.user && req.user._id;
  const io = req.app.get('io');

  if (!fromUserId) return next(createHttpError(401, 'User not authenticated'));

  try {
    const result = await toggleLike({
      fromUserId,
      targetType: 'post',
      targetId: id,
      io,
    });

    res.json({
      status: 200,
      message: result.liked ? 'Post liked' : 'Like removed',
      data: { liked: result.liked, likesCount: result.likesCount ?? 0 },
    });
  } catch (err) {
    return next(err);
  }
};
export const getMyPostsController = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return next(createHttpError(401, 'User not authenticated'));

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;
    const sortParam = req.query.sort || '-createdAt';
    const filter = { author: userId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.city) filter.city = req.query.city;
    if (req.query.type) filter.type = req.query.type;

    const projection = {
      title: 1,
      createdAt: 1,
      country: 1,
      city: 1,
      date: 1,
      status: 1,
      media: 1,
      likesCount: 1,
      interestedUsers: 1,
      roleSlots: 1,
      maxAssigned: 1,
    };

    const [items, total] = await Promise.all([
      PostCollection.find(filter, projection)
        .sort(sortParam)
        .skip(skip)
        .limit(limit)
        .lean(),
      PostCollection.countDocuments(filter),
    ]);

    res.json({
      status: 200,
      data: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};
// 💼 Добавить / убрать заинтересованность
export const toggleInterestedController = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const post = await PostCollection.findById(id);
  if (!post) throw createHttpError(404, 'Post not found');

  const isInterested = post.interestedUsers.includes(userId);

  if (isInterested) {
    post.interestedUsers.pull(userId);
  } else {
    post.interestedUsers.push(userId);
  }

  await post.save();

  res.json({
    status: 200,
    message: isInterested
      ? 'Interest removed successfully'
      : 'User marked as interested',
    interestedCount: post.interestedUsers.length,
  });
};

// 🎯 Получить посты по фильтрам
export const getFilteredPostsController = async (req, res) => {
  const { city, type, roleNeeded } = req.query;
  const filter = {};

  if (city) filter.city = city;
  if (type) filter.type = type;
  if (roleNeeded) filter.roleNeeded = { $in: roleNeeded.split(',') };

  const posts = await PostCollection.find(filter)
    .populate('author', 'name surname city photo role')
    .sort({ createdAt: -1 });

  res.json({
    status: 200,
    message: 'Filtered posts fetched successfully',
    count: posts.length,
    data: posts,
  });
};

export const toggleFavoriteController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user._id;
    if (!userId) return next(createHttpError(401, 'User not authenticated'));

    const result = await toggleFavoriteService({
      userId,
      targetType: 'post',
      targetId: id,
    });

    res.json({
      status: 200,
      message: result.favorited
        ? 'Added to favorites'
        : 'Removed from favorites',
      data: { favorited: result.favorited },
    });
  } catch (err) {
    next(err);
  }
};
