import "dotenv/config";
import { prisma } from "./core/database.js";
import app from "./server.js";
import { logger } from "./core/logger.js";

["DATABASE_URL", "PORT", "HOST", "DEEPSEEK_API_KEY"].forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} is not defined`);
  }
});

try {
  await prisma.$connect();
  logger.info("Database connected");

  const port = parseInt(process.env.PORT || "3030");
  const host = process.env.HOST || "127.0.0.1";

  const server = app.listen(port, host, () => {
    logger.info(`Server is running on http://${host}:${port}`);
  });

  const gracefulShutdown = async () => {
    logger.info("Starting graceful shutdown...");
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
} catch (err) {
  logger.error(
    { error: err instanceof Error ? err.message : err },
    "Database connection failed",
  );
  process.exit(1);
}
