export abstract class BaseError<T extends string> extends Error {
  public readonly type: T;
  public readonly details?: Record<string, unknown>;
  public readonly statusCode: number;

  constructor(
    type: T,
    message: string,
    name: string,
    statusCode: number = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = name;
    this.type = type;
    this.details = details;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export enum AppErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  EXPIRED_CND = "EXPIRED_CND",
}

export const AppErrorMap: Record<AppErrorType, number> = {
  [AppErrorType.VALIDATION_ERROR]: 400,
  [AppErrorType.NOT_FOUND]: 404,
  [AppErrorType.CONFLICT]: 409,
  [AppErrorType.UNAUTHORIZED]: 401,
  [AppErrorType.FORBIDDEN]: 403,
  [AppErrorType.INTERNAL_ERROR]: 500,
  [AppErrorType.EXPIRED_CND]: 400,
};

export class AppError extends BaseError<AppErrorType> {
  constructor(
    type: AppErrorType,
    message: string,
    details?: Record<string, any>,
  ) {
    super(type, message, "AppError", AppErrorMap[type], details);
  }
}

export enum DeepSeekErrorType {
  API_COMMUNICATION_ERROR = "API_COMMUNICATION_ERROR",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  CREDENTIALS_ERROR = "CREDENTIALS_ERROR",
  ANALYSIS_ERROR = "ANALYSIS_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
}

export const DeepSeekErrorMap: Record<DeepSeekErrorType, number> = {
  [DeepSeekErrorType.API_COMMUNICATION_ERROR]: 502,
  [DeepSeekErrorType.INVALID_RESPONSE]: 502,
  [DeepSeekErrorType.RATE_LIMIT_EXCEEDED]: 429,
  [DeepSeekErrorType.CREDENTIALS_ERROR]: 500,
  [DeepSeekErrorType.ANALYSIS_ERROR]: 400,
  [DeepSeekErrorType.CONFIGURATION_ERROR]: 500,
};

export class DeepSeekError extends BaseError<DeepSeekErrorType> {
  constructor(
    type: DeepSeekErrorType,
    message: string,
    details?: Record<string, any>,
  ) {
    super(type, message, "DeepSeekError", DeepSeekErrorMap[type], details);
  }
}

export enum PdfErrorType {
  EMPTY_OR_UNREADABLE = "EMPTY_OR_UNREADABLE",
  PARSING_ERROR = "PARSING_ERROR",
}

export const PdfErrorMap: Record<PdfErrorType, number> = {
  [PdfErrorType.EMPTY_OR_UNREADABLE]: 400,
  [PdfErrorType.PARSING_ERROR]: 400,
};

export class PdfError extends BaseError<PdfErrorType> {
  constructor(
    type: PdfErrorType,
    message: string,
    details?: Record<string, any>,
  ) {
    super(type, message, "PdfError", PdfErrorMap[type], details);
  }
}
