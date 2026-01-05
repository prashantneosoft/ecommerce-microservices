const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { middleware } = require("@prashant-neosoft-ecommerce/shared");

const { auth } = middleware.auth;
const { standardLimiter } = middleware.rateLimiter;

router.use(auth);

router.post("/process", standardLimiter, paymentController.processPayment);
router.get("/:orderId", paymentController.getPaymentByOrder);
router.post("/:id/refund", paymentController.refundPayment);

module.exports = router;
