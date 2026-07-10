import { Response } from "express";
import { ZodError } from "zod";
import { BaseError } from "./error.js";
import { logger } from "./logger.js";

interface ApiResponse {
  error?: string;
  details?: any;
}

class ApiResponseHandler {
  // Higieniza os dados removendo chaves internas do banco de dados e IDs ilegíveis
  private static sanitize(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Date) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === "object") {
      if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
        return data;
      }

      const proto = Object.getPrototypeOf(data);
      if (proto !== null && proto !== Object.prototype) {
        return data;
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === "id" ||
          lowerKey.endsWith("id") ||
          lowerKey === "createdat" ||
          lowerKey === "updatedat" ||
          lowerKey === "deletedat"
        ) {
          continue;
        }
        sanitized[key] = this.sanitize(value);
      }
      return sanitized;
    }

    return data;
  }

  // Retorna uma resposta de sucesso
  static success<T>(res: Response, data: T, statusCode: number = 200): void {
    res.status(statusCode).json(this.sanitize(data));
  }

  static trycatchHandler(res: Response, error: unknown) {
    if (error instanceof BaseError) {
      switch (error.name) {
        case "ConflictError":
          this.conflict(res, error.message);
          return;
        case "NotFoundError":
          this.notFound(res, error.message);
          return;
      }
    }
    this.internalError(res, "Unhandled error", error);
  }

  // Retorna uma resposta de erro com detalhes
  static error(
    res: Response,
    error: string,
    details?: any,
    statusCode: number = 400,
  ): void {
    res.status(statusCode).json({
      error,
      ...(details && { details }),
    } as ApiResponse);
  }

  // Processa erros de validação do Zod

  static validationError(res: Response, zodError: ZodError): void {
    const details = zodError.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    res.status(400).json({
      error: "Dados inválidos",
      details,
    } as ApiResponse);
  }

  // Processa erros internos sem vazar informações

  static internalError(
    res: Response,
    context: string,
    error: any,
    statusCode: number = 500,
  ): void {
    logger.error({ context, msg: "Erro interno", error: error instanceof Error ? error.message : error });

    res.status(statusCode).json({
      error: "Erro interno do servidor",
    } as ApiResponse);
  }

  // Retorna erro de recurso não encontrado

  static notFound(res: Response, resource: string = "Recurso"): void {
    res.status(404).json({
      error: `${resource} não encontrado`,
    } as ApiResponse);
  }

  // Retorna erro de conflito (ex: CNPJ duplicado)

  static conflict(res: Response, error: string): void {
    res.status(409).json({
      error,
    } as ApiResponse);
  }

  // Retorna erro de recurso proibido

  static forbidden(res: Response, error: string): void {
    res.status(403).json({
      error,
    } as ApiResponse);
  }
}

export default ApiResponseHandler;
