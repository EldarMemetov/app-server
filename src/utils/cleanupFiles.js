import fs from 'fs/promises';
export const cleanupFiles = async (files = []) => {
  await Promise.all(
    files.map(async (f) => {
      if (!f?.path) return;
      try {
        await fs.unlink(f.path);
      } catch (err) {
        console.warn('cleanupFiles failed', err);
      }
    }),
  );
};
