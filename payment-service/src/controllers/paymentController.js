const paymentService = require("../services/paymentService");
const { asyncHandler } = require("../../../shared/middleware/errorHandler");

exports.processPayment = asyncHandler(async (req, res) => {
  const paymentData = {
    ...req.body,
    userId: req.user.userId,
  };

  const payment = await paymentService.processPayment(paymentData);

  res.status(201).json({
    success: true,
    data: payment,
  });
});

exports.getPaymentByOrder = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentByOrderId(req.params.orderId);

  res.json({
    success: true,
    data: payment,
  });
});

exports.refundPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.refundPayment(
    req.params.id,
    req.user.userId
  );

  res.json({
    success: true,
    data: payment,
  });
});

exports.handleEvent = asyncHandler(async (req, res) => {
  const { type, data } = req.body;

  const { EVENTS } = require("../../../shared/utils/constants");

  if (type === EVENTS.ORDER_CREATED) {
    await paymentService.handleOrderCreated(data);
  }

  res.json({ success: true });
});
