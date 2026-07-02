import express from "express";
import fornecedorRoute from "./routes/fornecedor.js";
import cndRoute from "./routes/cnd.js";

import cors from "cors";
import { logger } from "./lib/logger.js";

var app = express();
app.use(express.json());
app.use(cors());
app.set("query parser", "extended");

app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.originalUrl,
    query: req.query,
  }, "Incoming request");
  next();
});

app.use("/public", express.static("public"));
app.use("/fornecedor", fornecedorRoute);
app.use("/cnd", cndRoute);

export default app;
