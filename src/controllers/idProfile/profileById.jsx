import UserCollection from '../db/models/User.js';

export const getProfileById = async (id) => {
  const user = await UserCollection.findById(id);
  return user;
};
