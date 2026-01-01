const axios = require("axios");
const logger = require("../../../shared/utils/logger");

class RetryService {
  async retryWithBackoff(
    fn,
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000
  ) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const delay = Math.min(initialDelay * Math.pow(2, i), maxDelay);

        logger.warn(
          `Retry attempt ${
            i + 1
          }/${maxRetries} failed. Retrying in ${delay}ms...`,
          {
            error: error.message,
          }
        );

        if (i < maxRetries - 1) {
          await this.sleep(delay);
        }
      }
    }

    logger.error(`All ${maxRetries} retry attempts failed`, {
      error: lastError.message,
    });
    throw lastError;
  }

  async callServiceWithRetry(url, data, timeout = 10000) {
    return this.retryWithBackoff(async () => {
      const response = await axios.post(url, data, {
        timeout,
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    });
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new RetryService();
