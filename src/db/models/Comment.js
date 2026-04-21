import { Schema, model } from 'mongoose';

const commentSchema = new Schema(
  {
    // Вместо postId — универсальная пара
    targetType: {
      type: String,
      required: true,
      enum: ['post', 'forumTopic'], // расширяемо
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
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

commentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export default model('comment', commentSchema);
