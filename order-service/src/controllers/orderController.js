const orderService = require("../services/orderService");
const { asyncHandler } = require("../../../shared/middleware/errorHandler");

exports.createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user.userId, req.body);

  res.status(201).json({
    success: true,
    data: order,
  });
});

exports.getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const result = await orderService.getOrders(
    req.user.userId,
    parseInt(page),
    parseInt(limit)
  );

  res.json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user.userId);

  res.json({
    success: true,
    data: order,
  });
});

exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user.userId);

  res.json({
    success: true,
    data: order,
  });
});

exports.handleEvent = asyncHandler(async (req, res) => {
  const { type, data } = req.body;

  const { EVENTS } = require("../../../shared/utils/constants");

  switch (type) {
    case EVENTS.PAYMENT_PROCESSED:
      await orderService.handlePaymentProcessed(data);
      break;
    case EVENTS.PAYMENT_FAILED:
      await orderService.handlePaymentFailed(data);
      break;
  }

  res.json({ success: true });
});
