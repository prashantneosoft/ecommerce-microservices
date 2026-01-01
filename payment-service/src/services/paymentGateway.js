const logger = require("shared/utils/logger");

class PaymentGateway {
  async processPayment(paymentData) {
    logger.info("Processing payment...", { orderId: paymentData.orderId });

    await this.simulateDelay();

    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        transactionId: `txn_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        status: "completed",
        processedAt: new Date(),
      };
    } else {
      throw new Error(
        "Payment gateway error: Insufficient funds or card declined"
      );
    }
  }

  async refundPayment(transactionId, amount) {
    logger.info("Processing refund...", { transactionId });

    await this.simulateDelay();

    return {
      success: true,
      refundId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refundedAmount: amount,
      refundedAt: new Date(),
    };
  }

  async verifyPayment(transactionId) {
    await this.simulateDelay();

    return {
      verified: true,
      status: "completed",
    };
  }

  simulateDelay() {
    return new Promise((resolve) => {
      setTimeout(resolve, Math.random() * 2000 + 500);
    });
  }
}

module.exports = new PaymentGateway();
