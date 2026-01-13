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
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === "true" ? {} : undefined,
        retryStrategy: (times) => Math.min(times * 100, 2000),
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        logger.info("Redis connected successfully");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
        logger.info("Redis ready to accept commands");
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        logger.error("Redis error:", err);
      });

      this.client.on("close", () => {
        this.isConnected = false;
        logger.warn("Redis connection closed");
      });

      // Wait for connection to be ready
      await this.client.ping();

      return this.client;
    } catch (error) {
      this.isConnected = false;
      logger.error("Redis connection failed:", error);
      // Don't throw error, allow app to continue without Redis
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, expireSeconds = 300) {
    if (!this.isConnected) return;

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
    if (!this.isConnected) return;

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async exists(key) {
    if (!this.isConnected) return false;

    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }
}

module.exports = new RedisClient();
