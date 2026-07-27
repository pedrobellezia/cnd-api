import { Router, Request, Response, NextFunction } from "express";
import { FornecedorService } from "../services/fornecedor.js";
import {
  newFornecedorSchema,
  searchFornecedorSchema,
} from "../schemas/fornecedor.js";
import { normalizeResponse } from "../utils/normalize.js";
import { AppError, AppErrorType } from "../errors/custom-errors.js";
import { normalizeCnpj } from "../utils/normalize.js";

const fornecedorRoute = Router();

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
