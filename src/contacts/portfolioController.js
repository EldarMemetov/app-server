import UserCollection from '../db/models/User.js';
import {
  saveFileToCloudinary,
  deleteFromCloudinary,
} from '../utils/saveFileToCloudinary.js';

// === Добавить элемент в портфолио ===
export const addPortfolioItemController = async (req, res) => {
  const { _id: userId } = req.user;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const user = await UserCollection.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Считаем текущие фото и видео
  const photoCount = user.portfolio.filter(
    (item) => item.type === 'photo',
  ).length;
  const videoCount = user.portfolio.filter(
    (item) => item.type === 'video',
  ).length;

  // Считаем новые
  const newPhotoCount = req.files.filter((f) =>
    f.mimetype.startsWith('image'),
  ).length;
  const newVideoCount = req.files.filter((f) =>
    f.mimetype.startsWith('video'),
  ).length;

  // Проверяем лимиты
  if (photoCount + newPhotoCount > 10) {
    return res
      .status(400)
      .json({ message: 'Portfolio can have maximum 10 photos' });
  }
  if (videoCount + newVideoCount > 1) {
    return res.status(400).json({ message: 'Portfolio can have only 1 video' });
  }

  const uploadedItems = [];

  for (const file of req.files) {
    const { url, public_id } = await saveFileToCloudinary(file);
    const type = file.mimetype.startsWith('video') ? 'video' : 'photo';
    uploadedItems.push({ type, url, description: '', public_id });
  }

  user.portfolio.push(...uploadedItems);
  await user.save();

  res.status(201).json({
    status: 201,
    message: 'Portfolio items uploaded successfully',
    data: user.portfolio,
  });
};

// === Удалить элемент портфолио ===
export const deletePortfolioItemController = async (req, res) => {
  const { itemId } = req.params;
  const { _id: userId } = req.user;

  const user = await UserCollection.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const item = user.portfolio.id(itemId);
  if (!item)
    return res.status(404).json({ message: 'Portfolio item not found' });

  // Удаляем с Cloudinary, если включено
  if (item.public_id) {
    await deleteFromCloudinary(item.public_id);
  }

  user.portfolio = user.portfolio.filter(
    (el) => String(el._id) !== String(itemId),
  );
  await user.save();

  res.status(200).json({
    status: 200,
    message: 'Portfolio item deleted successfully',
    data: user.portfolio,
  });
};
