require("dotenv").config();
const express = require("express");
const axios = require("axios");
const helmet = require("helmet");
const cors = require("cors");
const { utils } = require("@prashant-neosoft-ecommerce/shared");

const logger = utils.logger;

const app = express();
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors());
app.use(express.json());

const events = [];
const serviceEndpoints = [
  { name: "order-service", url: "http://order-srv:4003/events" },
  { name: "payment-service", url: "http://payment-srv:4004/events" },
  { name: "product-service", url: "http://product-srv:4002/events" },
];

const retryWithBackoff = async (
  fn,
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 10000
) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delay = Math.min(initialDelay * Math.pow(2, i), maxDelay);

      logger.warn(
        `Retry attempt ${i + 1}/${maxRetries} failed. Retrying in ${delay}ms...`
      );

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

app.post("/events", async (req, res) => {
  const event = req.body;

  events.push({
    ...event,
    timestamp: new Date(),
    id: events.length + 1,
  });

  logger.info(`Event received: ${event.type}`, { eventId: events.length });

  const promises = serviceEndpoints.map(async (service) => {
    try {
      await retryWithBackoff(
        async () => {
          await axios.post(service.url, event, { timeout: 10000 });
          logger.info(`Event sent to ${service.name}`, {
            eventType: event.type,
          });
        },
        3,
        1000,
        10000
      );
    } catch (error) {
      logger.error(`Failed to send event to ${service.name} after retries`, {
        eventType: event.type,
        error: error.message,
      });
    }
  });

  Promise.allSettled(promises);

  res.status(200).json({ status: "OK" });
});

app.get("/events", (req, res) => {
  res.json(events);
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "event-bus",
    totalEvents: events.length,
  });
});

app.listen(PORT, () => {
  logger.info(`Event Bus listening on port ${PORT}`);
});
