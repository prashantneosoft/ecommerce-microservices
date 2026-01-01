require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const productRoutes = require("./routes/productRoutes");
const { errorHandler } = require("shared/middleware/errorHandler");
const { encryptionMiddleware } = require("shared/middleware/encryption");
const redisClient = require("shared/utils/redis");
const logger = require("shared/utils/logger");

const app = express();
const PORT = process.env.PORT || 4002;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(encryptionMiddleware);

app.use("/api/products", productRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "product-service" });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info("MongoDB connected");

    await redisClient.connect();

    app.listen(PORT, () => {
      logger.info(`Product Service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
