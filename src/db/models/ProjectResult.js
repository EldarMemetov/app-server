import { Schema, model } from 'mongoose';

const projectResultSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'post',
      required: true,
      unique: true, // Один результат на пост (от автора)
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    photos: [
      {
        url: { type: String, required: true },
        public_id: { type: String },
      },
    ],
    videoLinks: [
      {
        url: { type: String, required: true },
        title: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true },
);

projectResultSchema.pre('save', function (next) {
  if (this.photos && this.photos.length > 5) {
    return next(new Error('Maximum 5 photos allowed'));
  }
  next();
});

export default model('projectResult', projectResultSchema);
