import rateLimit from "express-rate-limit";
import { AppError, AppErrorType } from "../errors/custom-errors.js";

export const cndRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new AppError(
        AppErrorType.RATE_LIMIT_EXCEEDED,
        "Muitas requisições em pouco tempo. Aguarde um instante e tente novamente.",
      ),
    );
  },
});
