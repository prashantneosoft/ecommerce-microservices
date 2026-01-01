const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { auth } = require("../../../shared/middleware/auth");
const { validate, schemas } = require("../../../shared/middleware/validation");
const { standardLimiter } = require("../../../shared/middleware/rateLimiter");

router.use(auth);

router.post(
  "/",
  standardLimiter,
  validate(schemas.order),
  orderController.createOrder
);
router.get("/", orderController.getOrders);
router.get("/:id", orderController.getOrder);
router.put("/:id/cancel", orderController.cancelOrder);

module.exports = router;
