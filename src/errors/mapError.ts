import { BaseError } from "./custom-errors.js";
import { ZodError } from "zod";

export type MappedError = {
  statusCode: number;
  type: string;
  message: string;
  details?: Record<string, unknown>;
};

export function mapError(err: unknown): MappedError {
  if (err instanceof BaseError) {
    return {
      statusCode: err.statusCode,
      type: err.type,
      message: err.message,
      details: err.details,
    };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      type: "VALIDATION_ERROR",
      message: "Erro de validação dos dados de entrada",
      details: Object.fromEntries(
        err.issues.map((issue) => [issue.path.join("."), issue.message]),
      ),
    };
  }

  const message =
    err instanceof Error ? err.message : "Erro interno do servidor";
  const stack = err instanceof Error ? err.stack : undefined;

  return {
    statusCode: 500,
    type: "INTERNAL_ERROR",
    message: "Erro interno do servidor",
    details:
      process.env.NODE_ENV !== "production"
        ? { originalMessage: message, stack }
        : undefined,
  };
}
