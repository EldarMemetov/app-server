import { Schema, model } from 'mongoose';

const favoriteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'user'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

favoriteSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);

export default model('Favorite', favoriteSchema);
