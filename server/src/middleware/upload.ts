import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FILE_LIMITS } from '../config/constants.js';
import { UPLOADS_DIR } from '../paths.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (FILE_LIMITS.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: FILE_LIMITS.MAX_SIZE },
});
