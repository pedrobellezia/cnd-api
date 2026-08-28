import { Request, Response, NextFunction } from "express";
import { logger } from "../core/logger.js";
import { mapError } from "./mapError.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  const { statusCode, type, message, details } = mapError(err);

  // Padronização do Log
  const logData = {
    context: "errorHandler",
    path: req.originalUrl,
    method: req.method,
    statusCode,
    type,
    message: err.message || message,
    details,
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
