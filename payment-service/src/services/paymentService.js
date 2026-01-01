const Payment = require("../models/Payment");
const paymentGateway = require("./paymentGateway");
const retryService = require("./retryService");
const { AppError } = require("../../../shared/middleware/errorHandler");
const { EVENTS, PAYMENT_STATUS } = require("../../../shared/utils/constants");
const logger = require("../../../shared/utils/logger");

class PaymentService {
  async processPayment(paymentData) {
    const existingPayment = await Payment.findOne({
      orderId: paymentData.orderId,
    });

    if (existingPayment) {
      if (existingPayment.status === PAYMENT_STATUS.COMPLETED) {
        throw new AppError("Payment already processed for this order", 400);
      }
      return this.retryPayment(existingPayment._id);
    }

    const payment = await Payment.create({
      orderId: paymentData.orderId,
      userId: paymentData.userId,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod || "credit_card",
      status: PAYMENT_STATUS.PROCESSING,
    });

    try {
      const result = await retryService.retryWithBackoff(
        async () => await paymentGateway.processPayment(paymentData),
        3,
        1000,
        10000
      );

      payment.status = PAYMENT_STATUS.COMPLETED;
      payment.transactionId = result.transactionId;
      payment.gatewayResponse = result;
      await payment.save();

      await this.emitEvent(EVENTS.PAYMENT_PROCESSED, {
        orderId: payment.orderId,
        paymentId: payment._id,
        transactionId: payment.transactionId,
        amount: payment.amount,
      });

      logger.info(`Payment processed successfully: ${payment._id}`);
      return payment;
    } catch (error) {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.failureReason = error.message;
      await payment.save();

      await this.emitEvent(EVENTS.PAYMENT_FAILED, {
        orderId: payment.orderId,
        paymentId: payment._id,
        reason: error.message,
      });

      logger.error(`Payment failed: ${payment._id}`, error);
      throw new AppError("Payment processing failed", 400);
    }
  }

  async retryPayment(paymentId) {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status === PAYMENT_STATUS.COMPLETED) {
      throw new AppError("Payment already completed", 400);
    }

    payment.status = PAYMENT_STATUS.PROCESSING;
    await payment.save();

    try {
      const result = await retryService.retryWithBackoff(
        async () =>
          await paymentGateway.processPayment({
            orderId: payment.orderId,
            amount: payment.amount,
          }),
        3,
        1000,
        10000
      );

      payment.status = PAYMENT_STATUS.COMPLETED;
      payment.transactionId = result.transactionId;
      payment.gatewayResponse = result;
      await payment.save();

      await this.emitEvent(EVENTS.PAYMENT_PROCESSED, {
        orderId: payment.orderId,
        paymentId: payment._id,
        transactionId: payment.transactionId,
        amount: payment.amount,
      });

      return payment;
    } catch (error) {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.failureReason = error.message;
      await payment.save();

      await this.emitEvent(EVENTS.PAYMENT_FAILED, {
        orderId: payment.orderId,
        paymentId: payment._id,
        reason: error.message,
      });

      throw error;
    }
  }

  async getPaymentByOrderId(orderId) {
    const payment = await Payment.findOne({ orderId });

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    return payment;
  }

  async refundPayment(paymentId, userId) {
    const payment = await Payment.findOne({ _id: paymentId, userId });

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== PAYMENT_STATUS.COMPLETED) {
      throw new AppError("Can only refund completed payments", 400);
    }

    if (payment.status === PAYMENT_STATUS.REFUNDED) {
      throw new AppError("Payment already refunded", 400);
    }

    try {
      const result = await paymentGateway.refundPayment(
        payment.transactionId,
        payment.amount
      );

      payment.status = PAYMENT_STATUS.REFUNDED;
      payment.refundAmount = result.refundedAmount;
      payment.refundedAt = result.refundedAt;
      payment.gatewayResponse = { ...payment.gatewayResponse, refund: result };
      await payment.save();

      await this.emitEvent(EVENTS.PAYMENT_REFUNDED, {
        orderId: payment.orderId,
        paymentId: payment._id,
        refundAmount: payment.refundAmount,
      });

      logger.info(`Payment refunded: ${payment._id}`);
      return payment;
    } catch (error) {
      logger.error(`Refund failed: ${payment._id}`, error);
      throw new AppError("Refund processing failed", 400);
    }
  }

  async handleOrderCreated(data) {
    try {
      logger.info("Processing order payment...", { orderId: data.orderId });

      await this.processPayment({
        orderId: data.orderId,
        userId: data.userId,
        amount: data.totalAmount,
        paymentMethod: "credit_card",
      });
    } catch (error) {
      logger.error("Error processing order payment:", error);
    }
  }

  async emitEvent(type, data) {
    try {
      await retryService.callServiceWithRetry(
        `${process.env.EVENT_BUS_URL}/events`,
        { type, data }
      );
    } catch (error) {
      logger.error(`Failed to emit event ${type}:`, error);
    }
  }
}

module.exports = new PaymentService();
