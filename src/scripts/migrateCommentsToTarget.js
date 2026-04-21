import 'dotenv/config';
import mongoose from 'mongoose';
import Comment from '../db/models/Comment.js';

await mongoose.connect(process.env.MONGO_URL);

const res = await Comment.updateMany({ postId: { $exists: true } }, [
  { $set: { targetType: 'post', targetId: '$postId' } },
  { $unset: 'postId' },
]);
console.log('Migrated:', res.modifiedCount);
await mongoose.disconnect();

// migrateCommentsToTarget.js;
