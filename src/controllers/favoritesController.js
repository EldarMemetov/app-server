import createHttpError from 'http-errors';
import { toggleFavorite } from '../contacts/favorites.js';

export const toggleFavoriteController = async (req, res, next) => {
  const userId = req.user?._id;
  const { targetType, targetId } = req.body;

  if (!userId) return next(createHttpError(401, 'User not authenticated'));

  try {
    const result = await toggleFavorite({ userId, targetType, targetId });
    res.json({
      status: 200,
      message: result.favorited
        ? 'Added to favorites'
        : 'Removed from favorites',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
