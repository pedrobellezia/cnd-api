import { Request, Response, NextFunction } from "express";
import { AppError, AppErrorType } from "../errors/custom-errors.js";

export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.header("authorization");
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;

  if (!apiKey || apiKey !== process.env.API_KEY) {
    next(
      new AppError(AppErrorType.UNAUTHORIZED, "API key inválida ou ausente"),
    );
    return;
  }

  next();
}
