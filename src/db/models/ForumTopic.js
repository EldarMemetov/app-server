import { Schema, model } from 'mongoose';

const forumTopicSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 5000 },

    tags: { type: [String], default: [] },
    category: { type: String, default: '' },

    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },

    pinned: { type: Boolean, default: false },
    closed: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

forumTopicSchema.index({ createdAt: -1 });
forumTopicSchema.index({ tags: 1 });

export default model('forumTopic', forumTopicSchema);
