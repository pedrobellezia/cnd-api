import { Request, Response, NextFunction } from "express";
import { BaseError } from "./custom-errors.js";
import { logger } from "../core/logger.js";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  let statusCode = 500;
  let type = "INTERNAL_ERROR";
  let message = "Erro interno do servidor";
  let details: Record<string, unknown> | undefined = undefined;

  if (err instanceof BaseError) {
    statusCode = err.statusCode;
    type = err.type;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    type = "VALIDATION_ERROR";
    message = "Erro de validação dos dados de entrada";
    details = Object.fromEntries(
      err.issues.map((issue) => [issue.path.join("."), issue.message]),
    );
  } else {
    if (process.env.NODE_ENV !== "production") {
      details = {
        originalMessage: err.message,
        stack: err.stack,
      };
    }
  }

  // Padronização do Log
  const logData = {
    context: "errorHandler",
    path: req.originalUrl,
    method: req.method,
    statusCode,
    type,
    message: err.message || message,
    details: details || (err as any).details,
    ...(statusCode >= 500 && { stack: err.stack }),
  };

  if (statusCode >= 500) {
    logger.error(logData, `Erro no servidor: ${logData.message}`);
  } else {
    logger.warn(logData, `Erro na requisição: ${logData.message}`);
  }

  // Padronização da Resposta HTTP
  res.status(statusCode).json({
    type,
    message,
    ...(details && { details }),
  });
}

export default errorHandler;
