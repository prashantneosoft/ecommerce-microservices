require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { middleware, utils } = require("@prashant-neosoft-ecommerce/shared");

const { standardLimiter } = middleware.rateLimiter;
const { encrypt, decrypt } = middleware.encryption;
const logger = utils.logger;
const redisClient = utils.redis;
console.log(
  "redisClient :============================================",
  redisClient
);

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware (before Redis is needed)
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));

// Developer endpoints (no rate limiting needed)
app.post("/api/dev/encrypt", (req, res) => {
  try {
    const { payload } = req.body;
    const encrypted = encrypt(JSON.stringify(payload));

    res.json({
      success: true,
      encrypted,
      usage:
        'Send this encrypted string as { "encrypted": "..." } in request body',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Encryption failed",
    });
  }
});

app.post("/api/dev/decrypt", (req, res) => {
  try {
    const { encrypted } = req.body;
    const decrypted = decrypt(encrypted);

    res.json({
      success: true,
      decrypted: JSON.parse(decrypted),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Decryption failed",
    });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "api-gateway",
    redis: redisClient.isConnected ? "connected" : "disconnected",
  });
});

// Initialize and start server
const startServer = async () => {
  try {
    // Connect to Redis first
    await redisClient.connect();
    logger.info("Redis initialization complete");

    // Apply rate limiting after Redis is connected
    app.use(standardLimiter);

    // Proxy middleware for services
    app.use(
      "/api/auth",
      createProxyMiddleware({
        target: process.env.AUTH_SERVICE_URL || "http://auth-srv:4001",
        changeOrigin: true,
        onError: (err, req, res) => {
          logger.error("Auth service proxy error:", err);
          res.status(503).json({ error: "Auth service unavailable" });
        },
      })
    );

    app.use(
      "/api/products",
      createProxyMiddleware({
        target: process.env.PRODUCT_SERVICE_URL || "http://product-srv:4002",
        changeOrigin: true,
        onError: (err, req, res) => {
          logger.error("Product service proxy error:", err);
          res.status(503).json({ error: "Product service unavailable" });
        },
      })
    );

    app.use(
      "/api/orders",
      createProxyMiddleware({
        target: process.env.ORDER_SERVICE_URL || "http://order-srv:4003",
        changeOrigin: true,
        onError: (err, req, res) => {
          logger.error("Order service proxy error:", err);
          res.status(503).json({ error: "Order service unavailable" });
        },
      })
    );

    app.use(
      "/api/payments",
      createProxyMiddleware({
        target: process.env.PAYMENT_SERVICE_URL || "http://payment-srv:4004",
        changeOrigin: true,
        onError: (err, req, res) => {
          logger.error("Payment service proxy error:", err);
          res.status(503).json({ error: "Payment service unavailable" });
        },
      })
    );

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: "Route not found" });
    });

    // Start server
    app.listen(PORT, () => {
      logger.info(`API Gateway listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start API Gateway:", error);
    process.exit(1);
  }
};

startServer();
