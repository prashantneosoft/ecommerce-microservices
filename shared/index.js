module.exports = {
  middleware: {
    rateLimiter: require("./middleware/rateLimiter"),
    encryption: require("./middleware/encryption"),
    validation: require("./middleware/validation"),
    auth: require("./middleware/auth"),
    errorHandler: require("./middleware/errorHandler"),
  },
  utils: {
    logger: require("./utils/logger"),
    redis: require("./utils/redis"),
    constants: require("./utils/constants"),
  },
};
