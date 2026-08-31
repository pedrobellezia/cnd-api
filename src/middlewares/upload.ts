import multer from "multer";

const maxFileSizeMb = Number(process.env.PDF_MAX_FILE_SIZE_MB || 10);

export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
});
