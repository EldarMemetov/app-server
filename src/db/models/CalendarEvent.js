import { model, Schema } from 'mongoose';

const calendarEventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    post: { type: Schema.Types.ObjectId, ref: 'post' },
    expired: { type: Boolean, default: false },

    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true },
);
calendarEventSchema.index({ post: 1 }, { unique: true });
calendarEventSchema.index({ date: 1, expired: 1 });

const CalendarEvent = model('calendarEvent', calendarEventSchema);
export default CalendarEvent;
