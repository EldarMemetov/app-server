import { Schema, model } from 'mongoose';
import { roles } from '../../constants/roles.js';

const roleSlotSchema = new Schema(
  {
    role: { type: String, enum: roles, required: true },
    required: { type: Number, default: 1 },
    assigned: [{ type: Schema.Types.ObjectId, ref: 'user' }],
  },
  { _id: false },
);

const postSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    media: [
      {
        type: { type: String, enum: ['photo', 'video'], required: true },
        url: String,
        public_id: String,
      },
    ],
    roleSlots: { type: [roleSlotSchema], default: [] },
    country: { type: String, required: true },
    city: { type: String, required: true },
    date: { type: Date },
    type: {
      type: String,
      enum: ['paid', 'tfp', 'collaboration'],
      default: 'tfp',
    },
    price: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'canceled'],
      default: 'open',
    },

    applicationsCount: { type: Number, default: 0 },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: 'user' }],
    maxAssigned: { type: Number, default: 5 },

    likesCount: { type: Number, default: 0 },
    favorites: [{ type: Schema.Types.ObjectId, ref: 'user' }],
    interestedUsers: [{ type: Schema.Types.ObjectId, ref: 'user' }],
  },
  { timestamps: true, versionKey: false },
);

export default model('post', postSchema);
