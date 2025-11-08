import UserCollection from '../db/models/User.js';
import {
  saveFileToCloudinary,
  deleteFromCloudinary,
} from '../utils/saveFileToCloudinary.js';

// === Загрузка или смена аватарки ===
export const uploadProfilePhotoController = async (req, res) => {
  const { _id } = req.user;
  const user = await UserCollection.findById(_id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  // Если было старое фото — удаляем
  if (user.photoPublicId) {
    await deleteFromCloudinary(user.photoPublicId);
  }

  const { url, public_id } = await saveFileToCloudinary(req.file);

  user.photo = url;
  user.photoPublicId = public_id;
  await user.save();

  res.status(200).json({
    status: 200,
    message: 'Profile photo updated successfully',
    data: { photo: user.photo },
  });
};

// === Добавление фото/видео в портфолио ===
export const addPortfolioItemController = async (req, res) => {
  const { _id } = req.user;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const { url, public_id } = await saveFileToCloudinary(req.file);
  const type = req.file.mimetype.startsWith('video') ? 'video' : 'photo';

  const updatedUser = await UserCollection.findByIdAndUpdate(
    _id,
    { $push: { portfolio: { type, url, description: '', public_id } } },
    { new: true },
  );

  res.status(201).json({
    status: 201,
    message: 'Portfolio item added successfully',
    data: updatedUser.portfolio,
  });
};

// === Удаление элемента из портфолио ===
export const deletePortfolioItemController = async (req, res) => {
  const { _id } = req.user;
  const { itemId } = req.params;

  const user = await UserCollection.findById(_id);
  const item = user.portfolio.id(itemId);

  if (!item)
    return res.status(404).json({ message: 'Portfolio item not found' });

  if (item.public_id) {
    await deleteFromCloudinary(item.public_id);
  }

  await UserCollection.findByIdAndUpdate(_id, {
    $pull: { portfolio: { _id: itemId } },
  });

  res.status(200).json({
    status: 200,
    message: 'Portfolio item deleted successfully',
  });
};
