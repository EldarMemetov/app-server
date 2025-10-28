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
    rating: { type: Number, default: 0 },
    experience: { type: String, default: '' },
    directions: { type: [String], default: [] },
    onlineStatus: { type: Boolean, default: false },
    aboutMe: { type: String, default: '' },
    portfolio: [
      {
        type: { type: String, enum: ['photo', 'video'], required: true },
        url: { type: String, required: true },
        description: { type: String, default: '' },
      },
    ],
  },
  { versionKey: false, timestamps: true },
);

userSchema.post('save', handleSaveError);

userSchema.pre('findOneAndUpdate', setupUpdateOptions);

userSchema.post('findOneAndUpdate', handleSaveError);

const UserCollection = model('user', userSchema);

export default UserCollection;
