import PostCollection from '../db/models/Post.js';
import UserCollection from '../db/models/User.js';
export const filterPostsController = async (req, res) => {
  const {
    city,
    country,
    roleNeeded,
    type,
    priceMin,
    priceMax,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (city) filter.city = city;
  if (country) filter.country = country;
  if (roleNeeded) filter.roleNeeded = { $in: [roleNeeded] };
  if (type) filter.type = type;
  if (priceMin || priceMax) {
    filter.price = {};
    if (priceMin) filter.price.$gte = Number(priceMin);
    if (priceMax) filter.price.$lte = Number(priceMax);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const posts = await PostCollection.find(filter)
    .skip(skip)
    .limit(Number(limit));

  const total = await PostCollection.countDocuments(filter);

  res.json({
    status: 200,
    message: 'Posts filtered successfully',
    data: posts,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
  });
};

export const filterUsersController = async (req, res) => {
  const {
    city,
    country,
    role,
    minRating,
    maxRating,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (city) filter.city = city;
  if (country) filter.country = country;
  if (role) filter.role = role;
  if (minRating || maxRating) {
    filter.rating = {};
    if (minRating) filter.rating.$gte = Number(minRating);
    if (maxRating) filter.rating.$lte = Number(maxRating);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const users = await UserCollection.find(filter)
    .select('-password')
    .skip(skip)
    .limit(Number(limit));

  const total = await UserCollection.countDocuments(filter);

  res.json({
    status: 200,
    message: 'Users filtered successfully',
    data: users,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
  });
};
