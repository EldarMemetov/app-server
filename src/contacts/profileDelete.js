import UserCollection from '../db/models/User';
// DELETE /profile/photo
export const deleteProfilePhotoController = async (req, res) => {
  const { _id } = req.user;

  const updatedUser = await UserCollection.findByIdAndUpdate(
    _id,
    { photo: '' },
    { new: true },
  ).select('-password');

  res.json({
    status: 200,
    message: 'Profile photo removed successfully',
    data: updatedUser,
  });
};
// DELETE /profile/about
export const deleteAboutController = async (req, res) => {
  const { _id } = req.user;

  const updatedUser = await UserCollection.findByIdAndUpdate(
    _id,
    { aboutMe: '', experience: '' },
    { new: true },
  ).select('-password');

  res.json({
    status: 200,
    message: 'About info removed successfully',
    data: updatedUser,
  });
};
// DELETE /profile/portfolio/:itemId
export const deletePortfolioItemController = async (req, res) => {
  const { _id } = req.user;
  const { itemId } = req.params;

  const updatedUser = await UserCollection.findByIdAndUpdate(
    _id,
    { $pull: { portfolio: { _id: itemId } } },
    { new: true },
  ).select('-password');

  if (!updatedUser) {
    return res.status(404).json({
      status: 404,
      message: 'User or portfolio item not found',
    });
  }

  res.json({
    status: 200,
    message: 'Portfolio item removed successfully',
    data: updatedUser,
  });
};
