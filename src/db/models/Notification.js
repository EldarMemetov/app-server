import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'user', required: true },

    fromUser: { type: Schema.Types.ObjectId, ref: 'user' },

    title: { type: String },
    message: { type: String },

    type: {
      type: String,
      enum: ['info', 'reminder', 'post', 'calendar', 'custom', 'like'],
      default: 'info',
    },

    read: { type: Boolean, default: false },
    relatedPost: { type: Schema.Types.ObjectId, ref: 'post' },
    relatedEvent: { type: Schema.Types.ObjectId, ref: 'calendarEvent' },
    scheduledAt: { type: Date },

    key: { type: String },
    meta: { type: Object, default: {} },
  },
  { timestamps: true, versionKey: false },
);

notificationSchema.index({ user: 1, key: 1 });

const Notification = model('notification', notificationSchema);
export default Notification;
