const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { middleware } = require("@prashant-neosoft-ecommerce/shared");

const { auth } = middleware.auth;
const { validate, schemas } = middleware.validation;
const { standardLimiter } = middleware.rateLimiter;

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
