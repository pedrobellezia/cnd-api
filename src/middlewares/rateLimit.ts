import rateLimit from "express-rate-limit";
import { AppError, AppErrorType } from "../errors/custom-errors.js";

const windowMs = Number(process.env.DEEPSEEK_RATE_LIMIT_WINDOW_MS || 60 * 1000);
const limit = Number(process.env.DEEPSEEK_RATE_LIMIT_MAX || 20);

export const deepseekRateLimit = rateLimit({
  windowMs,
  limit,
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
