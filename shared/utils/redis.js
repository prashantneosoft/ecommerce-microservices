const Redis = require("ioredis");
const logger = require("./logger");

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        logger.info("Redis connected successfully");
      });

      this.client.on("error", (err) => {
        logger.error("Redis error:", err);
      });

      return this.client;
    } catch (error) {
      logger.error("Redis connection failed:", error);
      throw error;
    }
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, expireSeconds = 300) {
    try {
      if (typeof value === "object") {
        value = JSON.stringify(value);
      }
      await this.client.set(key, value, "EX", expireSeconds);
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }
}

module.exports = new RedisClient();
