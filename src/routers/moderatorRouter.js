import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import { checkRole } from '../middlewares/checkRole.js';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as moderationCtrl from '../contacts/moderation.js';

const router = express.Router();

router.use(authenticate, checkRole(['moderator', 'admin']));

/* ---------- USERS ---------- */
router.get('/users', ctrlWrapper(moderationCtrl.getAllUsers));
router.patch('/users/:id/block', ctrlWrapper(moderationCtrl.blockUser));
router.patch('/users/:id/unblock', ctrlWrapper(moderationCtrl.unblockUser));

// смена роли — только админ
router.patch(
  '/users/:id/role',
  checkRole(['admin']),
  ctrlWrapper(moderationCtrl.changeUserRole),
);

/* ---------- POSTS ---------- */
router.get('/posts', ctrlWrapper(moderationCtrl.getAllPosts));
router.delete('/posts/:id', ctrlWrapper(moderationCtrl.deletePost));

/* ---------- COMMENTS ---------- */
// мягкое удаление одного коммента (ответы остаются) — основной способ для модератора
router.delete(
  '/comments/:commentId',
  ctrlWrapper(moderationCtrl.deleteComment),
);
// физическое удаление одного коммента — только админ (ответы НЕ удаляются)
router.delete(
  '/comments/:commentId/hard',
  checkRole(['admin']),
  ctrlWrapper(moderationCtrl.hardDeleteComment),
);

/* ---------- FORUM ---------- */
router.get('/forum/topics', ctrlWrapper(moderationCtrl.getAllForumTopics));

// soft (модератор + админ) — обычное удаление темы
router.delete(
  '/forum/topics/:id',
  ctrlWrapper(moderationCtrl.softDeleteForumTopic),
);
// hard (только админ) — физический снос темы со всем содержимым
router.delete(
  '/forum/topics/:id/hard',
  checkRole(['admin']),
  ctrlWrapper(moderationCtrl.hardDeleteForumTopic),
);

export default router;
