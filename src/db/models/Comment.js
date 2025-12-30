import { Schema, model } from 'mongoose';

const commentSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'post',
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    text: { type: String, required: true },
    deleted: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['visible', 'hidden', 'reported'],
      default: 'visible',
    },
  },
  { timestamps: true },
);

commentSchema.index({ postId: 1, createdAt: -1 });

const Comment = model('comment', commentSchema);
export default Comment;
