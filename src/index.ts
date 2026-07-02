import { prisma } from "./lib/prisma.js";
import app from "./server.js";
import { logger } from "./lib/logger.js";

["DATABASE_URL", "PORT"].forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} is not defined`);
  }
});

try {
  await prisma.$connect();
  logger.info("Database connected");

  const server = app.listen(parseInt(process.env.PORT!), "0.0.0.0", () => {
    logger.info(`Server is running on http://localhost:${process.env.PORT}`);
  });

  const gracefulShutdown = async () => {
    logger.info("Iniciando encerramento gracioso...");
    server.close(async () => {
      await prisma.$disconnect();
      logger.info("Servidor e banco de dados encerrados com sucesso.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
} catch (err) {
  logger.error({ error: err instanceof Error ? err.message : err }, "Database connection failed");
  process.exit(1);
}
