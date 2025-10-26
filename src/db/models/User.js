import { Schema, model } from 'mongoose';
import { emailRegexp } from '../../constants/users.js';
import { handleSaveError, setupUpdateOptions } from './hooks.js';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      match: emailRegexp,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { versionKey: false, timestamps: true },
);

userSchema.post('save', handleSaveError);

userSchema.pre('findOneAndUpdate', setupUpdateOptions);

userSchema.post('findOneAndUpdate', handleSaveError);

const UserCollection = model('user', userSchema);

export default UserCollection;
