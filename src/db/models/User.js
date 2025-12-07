import { Schema, model } from 'mongoose';
import { emailRegexp } from '../../constants/users.js';
import { handleSaveError, setupUpdateOptions } from './hooks.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    surname: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    photo: { type: String },

    roles: {
      type: [String],
      required: true,
      enum: [
        'model',
        'photographer',
        'videographer',
        'designer',
        'producer',
        'director',
        'editor',
        'retoucher',
        'business',
        'host',
        'dj',
        'fashionOwner',
        'stylist',
        'lighting',
        'soundEngineer',
      ],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) && arr.length >= 1 && arr.length <= 3,
        message: 'User must have between 1 and 3 roles',
      },
    },

    accessRole: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },

    email: { type: String, match: emailRegexp, required: true, unique: true },
    password: { type: String, required: true },

    rating: { type: Number, default: 0 },
    experience: { type: String, default: '' },
    directions: { type: [String], default: [] },
    onlineStatus: { type: Boolean, default: false },
    aboutMe: { type: String, default: '' },

    isBlocked: { type: Boolean, default: false },

    portfolio: [
      {
        type: { type: String, enum: ['photo', 'video'], required: true },
        url: { type: String, required: true },
        description: { type: String, default: '' },
        public_id: { type: String },
      },
    ],

    needsReview: { type: Boolean, default: false },
  },
  { versionKey: false, timestamps: true },
);

userSchema.post('save', handleSaveError);
userSchema.pre('findOneAndUpdate', setupUpdateOptions);
userSchema.post('findOneAndUpdate', handleSaveError);

const UserCollection = model('user', userSchema);

export default UserCollection;
