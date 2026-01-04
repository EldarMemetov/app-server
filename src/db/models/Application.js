import { Schema, model } from 'mongoose';
const applicationSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'post',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    appliedRole: { type: String, required: true },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['applied', 'withdrawn', 'selected', 'rejected'],
      default: 'applied',
    },
  },
  { timestamps: true },
);
applicationSchema.index({ post: 1, user: 1 }, { unique: true });
export default model('application', applicationSchema);
