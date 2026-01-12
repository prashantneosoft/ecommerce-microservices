require("dotenv").config({ path: "../.env" });
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const paymentRoutes = require("./routes/paymentRoutes");
const paymentController = require("./controllers/paymentController");
const { middleware, utils } = require("@prashant-neosoft-ecommerce/shared");

const { errorHandler } = middleware.errorHandler;
const { encryptionMiddleware } = middleware.encryption;
const redisClient = utils.redis;

// 👇 PERFECT usage
const logger = utils.logger.child({ service: "payment-service" });

const app = express();
const PORT = process.env.PORT || 4004;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(encryptionMiddleware);

app.use("/api/payments", paymentRoutes);
app.post("/events", paymentController.handleEvent);

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "payment-service" });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://erghadialiprashant_db_user:1vyB18f37DNeqhkZ@cluster0.5ln4qv9.mongodb.net/payments",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    logger.info("MongoDB connected");
    console.log("Payments is healthy and MongoDB is connected");

    app.listen(PORT, () => {
      logger.info(`Payment Service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
