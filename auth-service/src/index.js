const path = require("path");
require("dotenv").config({
  path:
    process.env.NODE_ENV === "development"
      ? path.resolve(".env.local")
      : path.resolve(".env.k8s"),
});

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const authRoutes = require("./routes/authRoutes");
const { middleware, utils } = require("@prashant-neosoft-ecommerce/shared");

const { errorHandler } = middleware.errorHandler;
const { encryptionMiddleware } = middleware.encryption;
const redisClient = utils.redis;
const logger = utils.logger;

const app = express();
const PORT = process.env.PORT || 4001;

// Basic middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    return next();
  }
  return encryptionMiddleware(req, res, next);
});

// Health check endpoint (before routes)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "auth-service",
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redisClient.isConnected ? "connected" : "disconnected",
  });
});

// Routes
app.use("/api/auth", authRoutes);

// Error handler (must be last)
app.use(errorHandler);

const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info("MongoDB connected successfully");
    console.log("connected-auth-srv-mongo");
    // Connect to Redis
    await redisClient.connect();
    logger.info("Redis connected successfully");

    // Start server
    app.listen(PORT, () => {
      logger.info(`Auth Service listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    logger.error("Failed to start Auth Service:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await mongoose.connection.close();
  if (redisClient.client) {
    await redisClient.client.quit();
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await mongoose.connection.close();
  if (redisClient.client) {
    await redisClient.client.quit();
  }
  process.exit(0);
});

startServer();

// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const helmet = require("helmet");
// const cors = require("cors");
// const compression = require("compression");
// const authRoutes = require("./routes/authRoutes");
// const { errorHandler } = require("@prashant-neosoft-ecommerce/shared");
// const { encryptionMiddleware } = require("@prashant-neosoft-ecommerce/shared");
// const redisClient = require("shared/utils/redis");
// const logger = require("shared/utils/logger");

// const app = express();
// const PORT = process.env.PORT || 4001;

// app.use(helmet());
// app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
// app.use(compression());
// app.use(express.json({ limit: "10mb" }));
// app.use(encryptionMiddleware);

// app.use("/api/auth", authRoutes);

// app.get("/health", (req, res) => {
//   res.json({ status: "healthy", service: "auth-service" });
// });

// app.use(errorHandler);

// const startServer = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       serverSelectionTimeoutMS: 5000,
//     });
//     logger.info("MongoDB connected");

//     await redisClient.connect();

//     app.listen(PORT, () => {
//       logger.info(`Auth Service listening on port ${PORT}`);
//     });
//   } catch (error) {
//     logger.error("Failed to start server:", error);
//     process.exit(1);
//   }
// };

// startServer();
