// import 'dotenv/config';
// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';
// import { initMongoConnection } from '../db/initMongoConnection.js';
// import UserCollection from '../db/models/User.js';

// const run = async () => {
//   const email = process.env.ADMIN_EMAIL;
//   const password = process.env.ADMIN_PASSWORD;

//   if (!email || !password) {
//     console.error('❌ Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
//     process.exit(1);
//   }

//   await initMongoConnection();

//   try {
//     const existing = await UserCollection.findOne({ email });

//     if (existing) {
//       await UserCollection.findOneAndUpdate(
//         { email },
//         { accessRole: 'admin', isBlocked: false },
//         { runValidators: false }, // ← пропускаем валидацию при обновлении
//       );
//       console.log(`✅ Existing user promoted to admin: ${email}`);
//     } else {
//       const hashed = await bcrypt.hash(password, 10);
//       await UserCollection.collection.insertOne({
//         // ← insertOne минует Mongoose-валидацию
//         name: 'Admin',
//         surname: 'Root',
//         country: 'N/A',
//         city: 'N/A',
//         email,
//         password: hashed,
//         roles: ['videographer'],
//         accessRole: 'admin',
//         agreedToPolicy: true,
//         agreedToPolicyAt: new Date(),
//         rating: 0,
//         experience: '',
//         directions: [],
//         onlineConnections: 0,
//         onlineStatus: false,
//         aboutMe: '',
//         isBlocked: false,
//         likesCount: 0,
//         heroType: null,
//         heroMedia: [],
//         socialLinks: {},
//         availability: 'local',
//         languages: [],
//         needsReview: false,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       });
//       console.log(`✅ Admin created: ${email}`);
//     }
//   } catch (err) {
//     console.error('❌ Seed failed:', err.message);
//     process.exitCode = 1;
//   } finally {
//     await mongoose.disconnect();
//     process.exit(process.exitCode || 0);
//   }
// };

// run();

// node src/scripts/seedAdmin.js
