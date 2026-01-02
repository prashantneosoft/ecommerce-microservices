const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisClient = require("../utils/redis");

const createRateLimiter = (options = {}) => {
  // Check if Redis client is connected
  if (!redisClient.client || !redisClient.isConnected) {
    console.warn("Redis not connected, using memory store for rate limiting");
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000,
      max: options.max || 100,
      message: options.message || "Too many requests, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  return rateLimit({
    store: new RedisStore({
      // Use sendCommand method from ioredis client
      sendCommand: (...args) => redisClient.client.call(...args),
      prefix: options.prefix || "rl:",
    }),
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Export factory functions that create limiters on-demand
module.exports = {
  createRateLimiter,
  get strictLimiter() {
    return createRateLimiter({ max: 5, windowMs: 60 * 1000 });
  },
  get standardLimiter() {
    return createRateLimiter({ max: 100 });
  },
  get generousLimiter() {
    return createRateLimiter({ max: 1000 });
  },
};
