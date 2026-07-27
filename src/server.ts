import express from "express";
import cors from "cors";
import fornecedorRoute from "./routes/fornecedor.js";
import cndRoute from "./routes/cnd.js";
import { logger } from "./core/logger.js";
import { errorHandler } from "./errors/errorHandler.js";

const app = express();

app.use(express.json());
app.use(cors());
app.set("query parser", "extended");

// Middlewares
app.use((req, res, next) => {
  logger.info(
    {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
    },
    "Incoming request",
  );
  next();
});
// Routes
app.use("/public", express.static("public"));
app.use("/fornecedor", fornecedorRoute);
app.use("/cnd", cndRoute);

// Error Handler
app.use(errorHandler);

export default app;
