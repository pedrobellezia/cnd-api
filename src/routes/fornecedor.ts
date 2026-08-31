import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { FornecedorService } from "../services/fornecedor.js";
import {
  newFornecedorSchema,
  searchFornecedorSchema,
} from "../schemas/fornecedor.js";
import { normalizeResponse } from "../utils/normalize.js";
import { AppError, AppErrorType } from "../errors/custom-errors.js";
import { normalizeCnpj } from "../utils/normalize.js";
import { logger } from "../core/logger.js";
import { mapError } from "../errors/mapError.js";
import { deepseekRateLimit } from "../middlewares/rateLimit.js";

const fornecedorRoute = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por arquivo
});

fornecedorRoute.post(
  "/pdf",
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
          const rs = await FornecedorService.processFile(file);
          results.push(rs);
        } catch (err: unknown) {
          logger.warn(
            {
              context: "fornecedorRoute.post./pdf",
              file: file.originalname,
              error: err,
            },
            "Falha no processamento de arquivo de fornecedor",
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

fornecedorRoute.post(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await newFornecedorSchema.parseAsync(req.body);

      const fornecedor = await FornecedorService.createFornecedor(data);

      res.status(201).json(normalizeResponse(fornecedor));
    } catch (error) {
      next(error);
    }
  },
);

fornecedorRoute.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = await searchFornecedorSchema.parseAsync(req.query);

      const fornecedores = await FornecedorService.listFornecedores(filters);

      res.status(200).json(normalizeResponse(fornecedores));
    } catch (error) {
      next(error);
    }
  },
);

fornecedorRoute.get(
  "/:cnpj",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cnpj } = req.params;

      if (!cnpj || typeof cnpj !== "string") {
        throw new AppError(AppErrorType.VALIDATION_ERROR, "CNPJ é obrigatório");
      }

      const normalizedCnpj = normalizeCnpj(cnpj);
      const fornecedor =
        await FornecedorService.getFornecedorWithCnds(normalizedCnpj);

      if (!fornecedor) {
        throw new AppError(AppErrorType.NOT_FOUND, "Fornecedor não encontrado");
      }

      res.status(200).json(normalizeResponse(fornecedor));
    } catch (error) {
      next(error);
    }
  },
);

export default fornecedorRoute;
