import UserCollection from '../db/models/User.js';

export const getProfileController = async (req, res) => {
  const { _id } = req.user;
  const user = await UserCollection.findById(_id).select('-password');
  res.json({
    status: 200,
    message: 'Profile fetched successfully',
    data: user,
  });
};

export const updateProfileController = async (req, res) => {
  const { _id } = req.user;
  const updatedUser = await UserCollection.findByIdAndUpdate(_id, req.body, {
    new: true,
    runValidators: true,
  }).select('-password');

  res.json({
    status: 200,
    message: 'Profile updated successfully',
    data: updatedUser,
  });
};

export const getAllProfilesController = async (req, res) => {
  const users = await UserCollection.find().select('-password');
  res.json({
    status: 200,
    message: 'All profiles fetched successfully',
    data: users,
  });
};
