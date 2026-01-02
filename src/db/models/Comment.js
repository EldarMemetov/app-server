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
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'comment',
      default: null,
    },
    replyTo: { type: Schema.Types.ObjectId, ref: 'user', default: null },
    deleted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['visible', 'hidden', 'reported'],
      default: 'visible',
    },

    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

commentSchema.index({ postId: 1, createdAt: -1 });

export default model('comment', commentSchema);
