import { Schema, model } from 'mongoose';

const postSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    photo: { type: String, default: '' },
    roleNeeded: { type: [String], default: [] },
    city: { type: String, required: true },
    date: { type: Date },
    type: {
      type: String,
      enum: ['paid', 'tfp', 'collaboration'],
      default: 'tfp',
    },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'canceled'],
      default: 'open',
    },
    candidates: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'user', required: true },
        message: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },

    likes: [{ type: Schema.Types.ObjectId, ref: 'user' }],
    favorites: [{ type: Schema.Types.ObjectId, ref: 'user' }],
    comments: [
      {
        author: { type: Schema.Types.ObjectId, ref: 'user', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
      },
    ],
    interestedUsers: [{ type: Schema.Types.ObjectId, ref: 'user' }],
  },
  { timestamps: true, versionKey: false },
);

const PostCollection = model('post', postSchema);
export default PostCollection;
