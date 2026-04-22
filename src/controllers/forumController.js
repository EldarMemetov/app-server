import createHttpError from 'http-errors';
import mongoose from 'mongoose';
import ForumTopic from '../db/models/ForumTopic.js';
import Comment from '../db/models/Comment.js';
import LikeCollection from '../db/models/like.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isAdminOrMod = (user) =>
  user && ['admin', 'moderator'].includes(user.role);

export const createTopicController = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return next(createHttpError(401, 'User not authenticated'));

    const { title, body = '', tags = [], category = '' } = req.body;

    const topic = await ForumTopic.create({
      author: userId,
      title,
      body,
      tags,
      category,
    });

    const populated = await ForumTopic.findById(topic._id)
      .populate('author', 'name surname photo role')
      .lean();

    try {
      const io = req.app?.get('io');
      if (io) io.emit('forumTopic:new', { topic: populated });
    } catch (e) {
      console.error('forumTopic:new emit error', e);
    }

    res.status(201).json({
      status: 201,
      message: 'Topic created successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const getTopicsController = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;

    const { category, tag, q, sort = 'new' } = req.query;

    const query = { deleted: false };
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim(), 'i');
      query.$or = [{ title: rx }, { body: rx }];
    }

    const sortMap = {
      new: { pinned: -1, createdAt: -1 },
      popular: { pinned: -1, likesCount: -1, createdAt: -1 },
      comments: { pinned: -1, commentsCount: -1, createdAt: -1 },
    };

    const [items, total] = await Promise.all([
      ForumTopic.find(query)
        .populate('author', 'name surname photo role')
        .sort(sortMap[sort] || sortMap.new)
        .skip(skip)
        .limit(limit)
        .lean(),
      ForumTopic.countDocuments(query),
    ]);

    const maybeUserId = req.user?._id;
    if (maybeUserId && items.length > 0) {
      const ids = items.map((t) => String(t._id));
      const likes = await LikeCollection.find({
        fromUserId: maybeUserId,
        targetType: 'forumTopic',
        targetId: { $in: ids },
      })
        .select('targetId')
        .lean();
      const likedSet = new Set(likes.map((l) => String(l.targetId)));
      items.forEach((t) => {
        t.liked = likedSet.has(String(t._id));
      });
    } else {
      items.forEach((t) => {
        t.liked = false;
      });
    }

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

export const getTopicByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return next(createHttpError(400, 'Invalid topic id'));

    const topic = await ForumTopic.findOneAndUpdate(
      { _id: id, deleted: false },
      { $inc: { viewsCount: 1 } },
      { new: true },
    )
      .populate('author', 'name surname photo role')
      .lean();

    if (!topic) return next(createHttpError(404, 'Topic not found'));

    const maybeUserId = req.user?._id;
    if (maybeUserId) {
      const like = await LikeCollection.exists({
        fromUserId: maybeUserId,
        targetType: 'forumTopic',
        targetId: topic._id,
      });
      topic.liked = Boolean(like);
    } else {
      topic.liked = false;
    }

    res.json({ status: 200, data: topic });
  } catch (err) {
    next(err);
  }
};

export const updateTopicController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) return next(createHttpError(401, 'User not authenticated'));
    if (!isValidId(id)) return next(createHttpError(400, 'Invalid topic id'));

    const topic = await ForumTopic.findById(id);
    if (!topic || topic.deleted)
      return next(createHttpError(404, 'Topic not found'));

    if (String(topic.author) !== String(userId) && !isAdminOrMod(req.user)) {
      return next(createHttpError(403, 'You can edit only your topics'));
    }
    if (topic.closed && !isAdminOrMod(req.user)) {
      return next(createHttpError(403, 'Topic is closed'));
    }

    const fields = ['title', 'body', 'tags', 'category'];
    for (const f of fields) {
      if (req.body[f] !== undefined) topic[f] = req.body[f];
    }
    await topic.save();

    const populated = await ForumTopic.findById(topic._id)
      .populate('author', 'name surname photo role')
      .lean();

    try {
      const io = req.app?.get('io');
      if (io) io.emit('forumTopic:updated', { topic: populated });
    } catch (e) {
      console.error('forumTopic:updated emit error', e);
    }

    res.json({
      status: 200,
      message: 'Topic updated successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTopicController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) return next(createHttpError(401, 'User not authenticated'));
    if (!isValidId(id)) return next(createHttpError(400, 'Invalid topic id'));

    const topic = await ForumTopic.findById(id);
    if (!topic || topic.deleted)
      return next(createHttpError(404, 'Topic not found'));

    if (String(topic.author) !== String(userId) && !isAdminOrMod(req.user)) {
      return next(createHttpError(403, 'Not allowed'));
    }

    topic.deleted = true;
    await topic.save();

    await Comment.updateMany(
      { targetType: 'forumTopic', targetId: topic._id },
      { $set: { deleted: true } },
    );

    try {
      const io = req.app?.get('io');
      if (io) io.emit('forumTopic:deleted', { topicId: String(topic._id) });
    } catch (e) {
      console.error('forumTopic:deleted emit error', e);
    }

    res.json({ status: 200, message: 'Topic deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const moderateTopicController = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return next(createHttpError(400, 'Invalid topic id'));
    if (!isAdminOrMod(req.user))
      return next(createHttpError(403, 'Not allowed'));

    const update = {};
    if (typeof req.body.pinned === 'boolean') update.pinned = req.body.pinned;
    if (typeof req.body.closed === 'boolean') update.closed = req.body.closed;

    const topic = await ForumTopic.findByIdAndUpdate(id, update, { new: true })
      .populate('author', 'name surname photo role')
      .lean();

    if (!topic) return next(createHttpError(404, 'Topic not found'));

    try {
      const io = req.app?.get('io');
      if (io) io.emit('forumTopic:updated', { topic });
    } catch (e) {
      console.log(e);
    }

    res.json({
      status: 200,
      message: 'Topic moderated successfully',
      data: topic,
    });
  } catch (err) {
    next(err);
  }
};
