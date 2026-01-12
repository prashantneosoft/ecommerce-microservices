require("dotenv").config({ path: "../.env" });
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const orderRoutes = require("./routes/orderRoutes");
const orderController = require("./controllers/orderController");
const { middleware, utils } = require("@prashant-neosoft-ecommerce/shared");

const { errorHandler } = middleware.errorHandler;
const { encryptionMiddleware } = middleware.encryption;
const redisClient = utils.redis;
const logger = utils.logger.child({ service: "order-service" });

const app = express();
const PORT = process.env.PORT || 4003;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(encryptionMiddleware);

app.use("/api/orders", orderRoutes);
app.post("/events", orderController.handleEvent);

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "order-service" });
});

app.use(errorHandler);
const startServer = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://erghadialiprashant_db_user:1vyB18f37DNeqhkZ@cluster0.5ln4qv9.mongodb.net/orders",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    logger.info("MongoDB connected");
    console.log("order-service is healthy and MongoDB connected");
    await redisClient.connect();

    app.listen(PORT, () => {
      logger.info(`Order Service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
