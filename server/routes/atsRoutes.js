import express from 'express';
import multer from 'multer';
import { analyzeResume } from '../controllers/atsController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/analyze', upload.single('resume'), analyzeResume);

export default router;