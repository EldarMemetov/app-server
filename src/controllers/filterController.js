import PostCollection from '../db/models/Post.js';
import UserCollection from '../db/models/User.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ci = (v) => new RegExp(`^${escapeRegex(v)}$`, 'i');

export const filterPostsController = async (req, res) => {
  const {
    city,
    country,
    roleNeeded,
    type,
    priceMin,
    priceMax,
    status,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = { status: status || 'open' };

  if (city) filter.city = ci(city);
  if (country) filter.country = ci(country);
  if (roleNeeded) filter['roleSlots.role'] = roleNeeded;
  if (type) filter.type = type;

  if (
    (priceMin || priceMax) &&
    (!type || ['paid', 'negotiable'].includes(type))
  ) {
    filter.price = {};
    if (priceMin) filter.price.$gte = Number(priceMin);
    if (priceMax) filter.price.$lte = Number(priceMax);
  }

  const lim = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const pg = Math.max(Number(page) || 1, 1);
  const skip = (pg - 1) * lim;

  const [posts, total] = await Promise.all([
    PostCollection.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    PostCollection.countDocuments(filter),
  ]);

  res.json({
    status: 200,
    message: 'Posts filtered successfully',
    data: posts,
    meta: { page: pg, limit: lim, total },
  });
};

export const filterUsersController = async (req, res) => {
  const {
    city,
    country,
    role,
    directions,
    minRating,
    maxRating,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = { isBlocked: false };

  if (city) filter.city = ci(city);
  if (country) filter.country = ci(country);
  if (role) filter.roles = role;
  if (directions) {
    const dirsArray = Array.isArray(directions)
      ? directions
      : directions.split(',');
    filter.directions = { $in: dirsArray };
  }
  if (minRating || maxRating) {
    filter.rating = {};
    if (minRating) filter.rating.$gte = Number(minRating);
    if (maxRating) filter.rating.$lte = Number(maxRating);
  }

  const lim = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const pg = Math.max(Number(page) || 1, 1);
  const skip = (pg - 1) * lim;

  const [users, total] = await Promise.all([
    UserCollection.find(filter)
      .select('-password')
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    UserCollection.countDocuments(filter),
  ]);

  res.json({
    status: 200,
    message: 'Users filtered successfully',
    data: users,
    meta: { page: pg, limit: lim, total },
  });
};
