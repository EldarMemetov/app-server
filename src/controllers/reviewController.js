import Review from '../db/models/Review.js';
import ProjectResult from '../db/models/ProjectResult.js';
import PostCollection from '../db/models/Post.js';
import Application from '../db/models/Application.js';
import createHttpError from 'http-errors';
import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';
import { createNotification } from '../utils/notifications.js';

// ✅ Автор подтверждает что съёмка прошла
export const confirmShootingController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const io = req.app?.get('io');

    const post = await PostCollection.findById(id);
    if (!post) return next(createHttpError(404, 'Post not found'));

    if (post.author.toString() !== userId.toString()) {
      return next(
        createHttpError(403, 'Only the post author can confirm shooting'),
      );
    }

    if (post.status !== 'in_progress') {
      return next(
        createHttpError(400, 'Post must be in_progress to confirm shooting'),
      );
    }

    post.status = 'shooting_done';
    await post.save();

    // Уведомляем всех участников
    const participants = post.assignedTo || [];
    for (const participantId of participants) {
      const notification = await createNotification({
        user: participantId,
        type: 'post',
        key: 'shooting_completed',
        title: `Съёмка "${post.title}" завершена!`,
        message: 'Теперь вы можете оставить отзыв о проекте',
        relatedPost: post._id,
        meta: { postId: post._id },
        unique: true,
        uniqueMetaKeys: ['postId', 'user'],
      });

      if (io) {
        io.sendToUser(participantId, 'notification:new', notification);
      }
    }

    res.json({
      status: 200,
      message: 'Shooting confirmed. Participants can now leave reviews.',
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Добавить отзыв (любой участник)
export const addReviewController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { text, rating } = req.body;

    if (!text || !rating) {
      return next(createHttpError(400, 'Text and rating are required'));
    }

    if (rating < 1 || rating > 5) {
      return next(createHttpError(400, 'Rating must be between 1 and 5'));
    }

    const post = await PostCollection.findById(id);
    if (!post) return next(createHttpError(404, 'Post not found'));

    if (post.status !== 'shooting_done') {
      return next(
        createHttpError(
          400,
          'Reviews can only be added after shooting is done',
        ),
      );
    }

    // Проверяем что пользователь участник (автор или assignedTo)
    const isAuthor = post.author.toString() === userId.toString();
    const isParticipant = (post.assignedTo || []).some(
      (uid) => uid.toString() === userId.toString(),
    );

    if (!isAuthor && !isParticipant) {
      return next(
        createHttpError(403, 'Only project participants can leave reviews'),
      );
    }

    // Проверяем нет ли уже отзыва
    const existingReview = await Review.findOne({ post: id, author: userId });
    if (existingReview) {
      return next(
        createHttpError(400, 'You already left a review for this project'),
      );
    }

    const review = await Review.create({
      post: id,
      author: userId,
      text,
      rating,
    });

    const populated = await Review.findById(review._id).populate(
      'author',
      'name surname photo role',
    );

    res.status(201).json({
      status: 201,
      message: 'Review added successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Редактировать отзыв
export const updateReviewController = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;
    const { text, rating } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) return next(createHttpError(404, 'Review not found'));

    if (review.author.toString() !== userId.toString()) {
      return next(createHttpError(403, 'You can only edit your own review'));
    }

    if (text !== undefined) review.text = text;
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return next(createHttpError(400, 'Rating must be between 1 and 5'));
      }
      review.rating = rating;
    }

    await review.save();

    const populated = await Review.findById(review._id).populate(
      'author',
      'name surname photo role',
    );

    res.json({
      status: 200,
      message: 'Review updated successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Удалить отзыв
export const deleteReviewController = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) return next(createHttpError(404, 'Review not found'));

    if (review.author.toString() !== userId.toString()) {
      return next(createHttpError(403, 'You can only delete your own review'));
    }

    await review.deleteOne();

    res.json({
      status: 200,
      message: 'Review deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Добавить результаты (только автор поста)
export const addResultsController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { videoLinks } = req.body;

    const post = await PostCollection.findById(id);
    if (!post) return next(createHttpError(404, 'Post not found'));

    if (post.author.toString() !== userId.toString()) {
      return next(createHttpError(403, 'Only the post author can add results'));
    }

    if (post.status !== 'shooting_done') {
      return next(
        createHttpError(
          400,
          'Results can only be added after shooting is done',
        ),
      );
    }

    // Проверяем есть ли уже результаты
    const existingResult = await ProjectResult.findOne({ post: id });
    if (existingResult) {
      return next(
        createHttpError(400, 'Results already exist. Use update endpoint.'),
      );
    }

    // Загружаем фото в Cloudinary
    const photos = [];
    if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        return next(createHttpError(400, 'Maximum 5 photos allowed'));
      }

      for (const file of req.files) {
        if (!file.mimetype.startsWith('image')) {
          return next(createHttpError(400, 'Only images are allowed'));
        }
        const { url, public_id } = await saveFileToCloudinary(file);
        photos.push({ url, public_id });
      }
    }

    // Парсим videoLinks
    let parsedVideoLinks = [];
    if (videoLinks) {
      parsedVideoLinks =
        typeof videoLinks === 'string' ? JSON.parse(videoLinks) : videoLinks;
    }

    const result = await ProjectResult.create({
      post: id,
      author: userId,
      photos,
      videoLinks: parsedVideoLinks,
    });

    res.status(201).json({
      status: 201,
      message: 'Results added successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Обновить результаты
export const updateResultsController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { videoLinks, removePhotos } = req.body;

    const post = await PostCollection.findById(id);
    if (!post) return next(createHttpError(404, 'Post not found'));

    if (post.author.toString() !== userId.toString()) {
      return next(
        createHttpError(403, 'Only the post author can update results'),
      );
    }

    const result = await ProjectResult.findOne({ post: id });
    if (!result) {
      return next(
        createHttpError(404, 'Results not found. Create them first.'),
      );
    }

    // Удаляем указанные фото
    if (removePhotos && Array.isArray(removePhotos)) {
      result.photos = result.photos.filter(
        (p) => !removePhotos.includes(p.public_id),
      );
    }

    // Добавляем новые фото
    if (req.files && req.files.length > 0) {
      const totalPhotos = result.photos.length + req.files.length;
      if (totalPhotos > 5) {
        return next(
          createHttpError(
            400,
            `Maximum 5 photos. You have ${result.photos.length}, trying to add ${req.files.length}`,
          ),
        );
      }

      for (const file of req.files) {
        if (!file.mimetype.startsWith('image')) {
          return next(createHttpError(400, 'Only images are allowed'));
        }
        const { url, public_id } = await saveFileToCloudinary(file);
        result.photos.push({ url, public_id });
      }
    }

    // Обновляем видео ссылки
    if (videoLinks !== undefined) {
      result.videoLinks =
        typeof videoLinks === 'string' ? JSON.parse(videoLinks) : videoLinks;
    }

    await result.save();

    res.json({
      status: 200,
      message: 'Results updated successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Получить завершённые проекты пользователя (для профиля)
export const getUserCompletedProjectsController = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Находим посты где пользователь автор или участник И статус shooting_done
    const posts = await PostCollection.find({
      status: 'shooting_done',
      $or: [{ author: userId }, { assignedTo: userId }],
    })
      .populate('author', 'name surname photo role')
      .sort({ updatedAt: -1 })
      .lean();

    // Для каждого поста получаем отзывы, результаты и команду
    const projectsWithDetails = await Promise.all(
      posts.map(async (post) => {
        const [reviews, results, applications] = await Promise.all([
          Review.find({ post: post._id })
            .populate('author', 'name surname photo role')
            .lean(),
          ProjectResult.findOne({ post: post._id }).lean(),
          Application.find({ post: post._id, status: 'selected' })
            .populate('user', 'name surname photo role')
            .lean(),
        ]);

        // Формируем команду
        const team = applications.map((app) => ({
          user: app.user,
          role: app.appliedRole,
        }));

        // Добавляем автора в команду
        team.unshift({
          user: post.author,
          role: 'author',
        });

        return {
          ...post,
          reviews,
          results,
          team,
          reviewsCount: reviews.length,
          averageRating: reviews.length
            ? (
                reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              ).toFixed(1)
            : null,
        };
      }),
    );

    res.json({
      status: 200,
      message: 'Completed projects fetched successfully',
      data: projectsWithDetails,
      count: projectsWithDetails.length,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Получить отзывы пользователя (вкладка "Мои отзывы")
export const getUserReviewsController = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Отзывы которые ПОЛУЧИЛ пользователь (на проектах где он участвовал)
    const userPosts = await PostCollection.find({
      status: 'shooting_done',
      $or: [{ author: userId }, { assignedTo: userId }],
    }).select('_id');

    const postIds = userPosts.map((p) => p._id);

    const reviews = await Review.find({
      post: { $in: postIds },
    })
      .populate('author', 'name surname photo role')
      .populate({
        path: 'post',
        select: 'title date city',
        populate: { path: 'author', select: 'name surname photo' },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      status: 200,
      message: 'User reviews fetched successfully',
      data: reviews,
      count: reviews.length,
    });
  } catch (err) {
    next(err);
  }
};
