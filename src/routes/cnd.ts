import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { CndService } from "../services/cnd.js";
import { AppError, AppErrorType, BaseError } from "../errors/custom-errors.js";
import { normalizeResponse } from "../utils/normalize.js";
import { logger } from "../core/logger.js";
import { ZodError } from "zod";
import { cndRateLimit } from "../middlewares/rateLimit.js";

const cndRoute = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por arquivo
});

cndRoute.post(
  "/",
  cndRateLimit,
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
        } catch (err: any) {
          logger.warn(
            { context: "cndRoute.post", file: file.originalname, error: err },
            "Falha no processamento de arquivo de CND",
          );

          let type = "INTERNAL_ERROR";
          let message = "Erro interno do servidor";
          let details: Record<string, unknown> | undefined = undefined;

          if (err instanceof BaseError) {
            type = err.type;
            message = err.message;
            details = err.details;
          } else if (err instanceof ZodError) {
            type = "VALIDATION_ERROR";
            message = "Erro de validação dos dados de entrada";
            details = Object.fromEntries(
              err.issues.map((issue) => [issue.path.join("."), issue.message]),
            );
          } else {
            message = err.message || message;
            if (process.env.NODE_ENV !== "production") {
              details = {
                originalMessage: err.message,
                stack: err.stack,
              };
            }
          }

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
