import PostCollection from '../db/models/Post.js';
import {
  saveFileToCloudinary,
  deleteFromCloudinary,
} from '../utils/saveFileToCloudinary.js';

// === Загрузка медиа к посту ===
export const uploadPostMediaController = async (req, res) => {
  const { id } = req.params; // ID поста
  const { _id: userId } = req.user;

  const post = await PostCollection.findById(id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (String(post.author) !== String(userId))
    return res.status(403).json({ message: 'Access denied' });

  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: 'No files uploaded' });

  const photoCount = post.media.filter((item) => item.type === 'photo').length;
  const videoCount = post.media.filter((item) => item.type === 'video').length;

  const newPhotoCount = req.files.filter((f) =>
    f.mimetype.startsWith('image'),
  ).length;
  const newVideoCount = req.files.filter((f) =>
    f.mimetype.startsWith('video'),
  ).length;

  if (photoCount + newPhotoCount > 3) {
    return res.status(400).json({ message: 'Post can have maximum 3 photos' });
  }
  if (videoCount + newVideoCount > 1) {
    return res.status(400).json({ message: 'Post can have only 1 video' });
  }

  const uploadedMedia = [];

  for (const file of req.files) {
    const { url, public_id } = await saveFileToCloudinary(file);
    const type = file.mimetype.startsWith('video') ? 'video' : 'photo';
    uploadedMedia.push({ type, url, public_id });
  }

  post.media.push(...uploadedMedia);
  await post.save();

  res.status(201).json({
    status: 201,
    message: 'Media uploaded successfully',
    data: post.media,
  });
};

// === Удаление медиа из поста ===
export const deletePostMediaController = async (req, res) => {
  const { id, mediaId } = req.params;
  const { _id: userId } = req.user;

  const post = await PostCollection.findById(id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (String(post.author) !== String(userId))
    return res.status(403).json({ message: 'Access denied' });

  const mediaItem = post.media.id(mediaId);
  if (!mediaItem) return res.status(404).json({ message: 'Media not found' });

  if (mediaItem.public_id) {
    await deleteFromCloudinary(mediaItem.public_id);
  }

  post.media = post.media.filter(
    (item) => String(item._id) !== String(mediaId),
  );
  await post.save();

  res.status(200).json({
    status: 200,
    message: 'Media deleted successfully',
  });
};
