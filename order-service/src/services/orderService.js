const Order = require("../models/Order");
const axios = require("axios");
const retryService = require("./retryService");
const redisClient = require("shared/utils/redis");
const { AppError } = require("shared/middleware/errorHandler");
const { EVENTS, ORDER_STATUS } = require("shared/utils/constants");
const logger = require("shared/utils/logger");

class OrderService {
  async createOrder(userId, orderData) {
    try {
      const productIds = orderData.items.map((item) => item.productId);

      const productsResponse = await retryService.callServiceWithRetry(
        `${process.env.PRODUCT_SERVICE_URL}/api/products/bulk`,
        { ids: productIds }
      );

      const products = productsResponse.data;

      let totalAmount = 0;
      const orderItems = orderData.items.map((item) => {
        const product = products.find(
          (p) => p._id.toString() === item.productId
        );

        if (!product) {
          throw new AppError(`Product ${item.productId} not found`, 404);
        }

        if (product.stock < item.quantity) {
          throw new AppError(`Insufficient stock for ${product.name}`, 400);
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        return {
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
        };
      });

      const order = await Order.create({
        userId,
        items: orderItems,
        totalAmount,
        shippingAddress: orderData.shippingAddress,
        status: ORDER_STATUS.PENDING,
      });

      await this.emitEvent(EVENTS.ORDER_CREATED, {
        orderId: order._id,
        userId: order.userId,
        items: order.items,
        totalAmount: order.totalAmount,
      });

      logger.info(`Order created: ${order._id}`);

      await redisClient.del(`orders:user:${userId}`);

      return order;
    } catch (error) {
      logger.error("Order creation failed:", error);
      throw error;
    }
  }

  async getOrders(userId, page = 1, limit = 10) {
    const cacheKey = `orders:user:${userId}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const skip = (page - 1) * limit;
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ userId });

    const result = {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    await redisClient.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  async getOrderById(orderId, userId) {
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    return order;
  }

  async cancelOrder(orderId, userId) {
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (!["pending", "confirmed"].includes(order.status)) {
      throw new AppError("Cannot cancel order in current status", 400);
    }

    order.status = ORDER_STATUS.CANCELLED;
    await order.save();

    await this.emitEvent(EVENTS.ORDER_CANCELLED, {
      orderId: order._id,
      items: order.items,
    });

    await redisClient.del(`orders:user:${userId}`);

    return order;
  }

  async handlePaymentProcessed(data) {
    try {
      const order = await Order.findById(data.orderId);

      if (!order) {
        logger.error(`Order not found: ${data.orderId}`);
        return;
      }

      order.paymentStatus = "completed";
      order.paymentId = data.paymentId;
      order.status = ORDER_STATUS.CONFIRMED;
      await order.save();

      await this.emitEvent(EVENTS.ORDER_UPDATED, {
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
      });

      await redisClient.del(`orders:user:${order.userId}`);

      logger.info(`Payment processed for order: ${order._id}`);
    } catch (error) {
      logger.error("Error handling payment processed:", error);
    }
  }

  async handlePaymentFailed(data) {
    try {
      const order = await Order.findById(data.orderId);

      if (!order) {
        logger.error(`Order not found: ${data.orderId}`);
        return;
      }

      order.paymentStatus = "failed";
      order.status = ORDER_STATUS.FAILED;
      order.notes = data.reason || "Payment failed";
      await order.save();

      await redisClient.del(`orders:user:${order.userId}`);

      logger.info(`Payment failed for order: ${order._id}`);
    } catch (error) {
      logger.error("Error handling payment failed:", error);
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

module.exports = new OrderService();
