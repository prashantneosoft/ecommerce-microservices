require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { standardLimiter } = require("shared/middleware/rateLimiter");
const { encrypt, decrypt } = require("shared/middleware/encryption");
const logger = require("shared/utils/logger");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(standardLimiter);

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

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "api-gateway" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
});
