// db/models/Review.js
import { Schema, model } from 'mongoose';

const reviewSchema = new Schema(
  {
    post: {
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
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ post: 1, author: 1 }, { unique: true });

export default model('review', reviewSchema);
