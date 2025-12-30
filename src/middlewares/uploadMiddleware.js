import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../utils/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, '../../tmp');

const storage = multer.diskStorage({
  destination: tempDir,
  filename: (_, file, cb) => {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniquePrefix}${ext}`);
  },
});

const GLOBAL_MAX_BYTES = Number(env('GLOBAL_MAX_BYTES', 120 * 1024 * 1024));

const fileFilter = (req, file, cb) => {
  if (!file.mimetype) return cb(null, false);

  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/')
  ) {
    return cb(null, true);
  }

  cb(null, false);
};

const upload = multer({
  storage,
  limits: { fileSize: GLOBAL_MAX_BYTES },
  fileFilter,
});

export default upload;
