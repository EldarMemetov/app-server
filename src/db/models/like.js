// db/models/Like.js
import { Schema, model } from 'mongoose';

const likeSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
  },
  { timestamps: true, versionKey: false },
);

likeSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

const LikeCollection = model('like', likeSchema);

export default LikeCollection;
