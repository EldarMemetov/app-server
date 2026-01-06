import PostCollection from '../db/models/Post.js';
import {
  saveFileToCloudinary,
  deleteFromCloudinary,
} from '../utils/saveFileToCloudinary.js';
import { cleanupFiles } from '../utils/cleanupFiles.js';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const uploadPostMediaController = async (req, res) => {
  const { id } = req.params;
  const { _id: userId } = req.user;

  const post = await PostCollection.findById(id);
  if (!post) {
    await cleanupFiles(req.files);
    return res.status(404).json({ message: 'Post not found' });
  }
  if (String(post.author) !== String(userId)) {
    await cleanupFiles(req.files);
    return res.status(403).json({ message: 'Access denied' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const photoCount = post.media.filter((item) => item.type === 'photo').length;
  const videoCount = post.media.filter((item) => item.type === 'video').length;

  const newPhotoCount = req.files.filter((f) =>
    f.mimetype?.startsWith('image'),
  ).length;
  const newVideoCount = req.files.filter((f) =>
    f.mimetype?.startsWith('video'),
  ).length;

  if (photoCount + newPhotoCount > 3) {
    await cleanupFiles(req.files);
    return res.status(400).json({ message: 'Post can have maximum 3 photos' });
  }
  if (videoCount + newVideoCount > 1) {
    await cleanupFiles(req.files);
    return res.status(400).json({ message: 'Post can have only 1 video' });
  }

  for (const f of req.files) {
    const isImage = f.mimetype?.startsWith('image/');
    const isVideo = f.mimetype?.startsWith('video/');
    const size = Number(f.size || 0);
    if (isImage && size > MAX_IMAGE_BYTES) {
      await cleanupFiles(req.files);
      return res.status(400).json({
        message: `Image ${f.originalname} is too large (max ${MAX_IMAGE_BYTES} bytes)`,
      });
    }
    if (isVideo && size > MAX_VIDEO_BYTES) {
      await cleanupFiles(req.files);
      return res.status(400).json({
        message: `Video ${f.originalname} is too large (max ${MAX_VIDEO_BYTES} bytes)`,
      });
    }
  }

  const uploadedMedia = [];

  try {
    for (const file of req.files) {
      const { url, public_id } = await saveFileToCloudinary(file);
      const type = file.mimetype.startsWith('video') ? 'video' : 'photo';
      uploadedMedia.push({ type, url, public_id });
    }

    post.media.push(...uploadedMedia);

    const photos = post.media.filter((m) => m.type === 'photo').length;
    const videos = post.media.filter((m) => m.type === 'video').length;
    if (photos > 3 || videos > 1) {
      for (const m of uploadedMedia) {
        if (m.public_id) {
          try {
            await deleteFromCloudinary(m.public_id);
          } catch (delErr) {
            console.warn(
              'deleteFromCloudinary failed during rollback:',
              delErr,
            );
          }
        }
      }
      await cleanupFiles(req.files);
      return res.status(400).json({ message: 'Media count limits exceeded' });
    }

    await post.save();
    await cleanupFiles(req.files);

    return res.status(201).json({
      status: 201,
      message: 'Media uploaded successfully',
      data: post.media,
    });
  } catch (err) {
    console.error('uploadPostMediaController error:', err);

    for (const m of uploadedMedia) {
      if (m.public_id) {
        try {
          await deleteFromCloudinary(m.public_id);
        } catch (delErr) {
          console.warn('deleteFromCloudinary failed in error handler:', delErr);
        }
      }
    }

    await cleanupFiles(req.files);
    return res.status(500).json({ message: 'Failed to upload media' });
  }
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
