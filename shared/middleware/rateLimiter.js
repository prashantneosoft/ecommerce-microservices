const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const redisClient = require("../utils/redis");

const createRateLimiter = (options = {}) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient.client,
      prefix: "rl:",
    }),
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100,
    message: options.message || "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const strictLimiter = createRateLimiter({ max: 5, windowMs: 60 * 1000 });
const standardLimiter = createRateLimiter({ max: 100 });
const generousLimiter = createRateLimiter({ max: 1000 });

module.exports = {
  createRateLimiter,
  strictLimiter,
  standardLimiter,
  generousLimiter,
};
