import { Schema, model } from 'mongoose';

const likeSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'user', required: true },

    targetType: {
      type: String,
      required: true,
      enum: ['user', 'post', 'comment', 'message'],
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true, versionKey: false },
);

likeSchema.index(
  { fromUserId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);

likeSchema.index({ targetType: 1, targetId: 1 });
likeSchema.index({ fromUserId: 1 });

const LikeCollection = model('like', likeSchema);
export default LikeCollection;
