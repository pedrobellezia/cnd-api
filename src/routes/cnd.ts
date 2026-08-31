import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { CndService } from "../services/cnd.js";
import { AppError, AppErrorType } from "../errors/custom-errors.js";
import { mapError } from "../errors/mapError.js";
import { searchCndSchema } from "../schemas/cnd.js";
import { normalizeResponse } from "../utils/normalize.js";
import { logger } from "../core/logger.js";
import { deepseekRateLimit } from "../middlewares/rateLimit.js";

const cndRoute = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por arquivo
});

cndRoute.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = await searchCndSchema.parseAsync(req.query);
      const result = await CndService.searchCnds(filters);
      res.status(200).json(normalizeResponse(result));
    } catch (error) {
      next(error);
    }
  },
);

cndRoute.post(
  "/",
  deepseekRateLimit,
  upload.array("file"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError(
          AppErrorType.VALIDATION_ERROR,
          "Arquivo PDF é obrigatório",
        );
      }

      const results = [];

      for (const file of req.files) {
        const isPdf = file.buffer.subarray(0, 5).toString() === "%PDF-";
        if (file.mimetype !== "application/pdf" || !isPdf) {
          throw new AppError(
            AppErrorType.VALIDATION_ERROR,
            `O arquivo "${file.originalname}" não é um PDF válido`,
          );
        }

        try {
          const rs = await CndService.processFiles(file);
          results.push(rs);
        } catch (err: unknown) {
          logger.warn(
            { context: "cndRoute.post", file: file.originalname, error: err },
            "Falha no processamento de arquivo de CND",
          );

          const { type, message, details } = mapError(err);

          results.push({
            file: file.originalname,
            success: false,
            error: {
              type,
              message,
              ...(details && { details }),
            },
          });
        }
      }

      res.status(201).json(normalizeResponse(results));
    } catch (error) {
      next(error);
    }
  },
);

export default cndRoute;
