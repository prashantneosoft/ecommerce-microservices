const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { auth } = require("shared/middleware/auth");
const { standardLimiter } = require("shared/middleware/rateLimiter");

router.use(auth);

router.post("/process", standardLimiter, paymentController.processPayment);
router.get("/:orderId", paymentController.getPaymentByOrder);
router.post("/:id/refund", paymentController.refundPayment);

module.exports = router;
