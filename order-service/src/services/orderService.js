const Order = require("../models/Order");
const axios = require("axios");

const { middleware, utils } = require("@prashant-neosoft-ecommerce/shared");

const redisClient = utils.redis;
const logger = utils.logger;
const { AppError } = middleware.errorHandler;
const { EVENTS, ORDER_STATUS } = utils.constants;

class OrderService {
  async createOrder(userId, orderData) {
    try {
      const productIds = orderData.items.map((item) => item.productId);

      // 🔹 Fetch products directly (NO retryService)
      const productsResponse = await axios.post(
        `${process.env.PRODUCT_SERVICE_URL}/api/products/bulk`,
        { ids: productIds },
        { timeout: 5000 }
      );

      const products = productsResponse.data.data;
      console.log("Products :", products);
      let totalAmount = 0;
      const orderItems = orderData.items.map((item) => {
        const product = products.find(
          (p) => p._id.toString() === item.productId
        );
        console.log("product single :>> ", product);
        if (!product) {
          throw new AppError(`Product ${item.productId} not found`, 404);
        }
        console.log("product.stock :>> ", product.stock);
        console.log("item.quantity :>> ", item.quantity);
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

      await redisClient.del(`orders:user:${userId}`);
      logger.info(`Order created: ${order._id}`);

      return order;
    } catch (error) {
      logger.error("Order creation failed", error);
      throw error;
    }
  }

  async getOrders(userId, page = 1, limit = 10) {
    const cacheKey = `orders:user:${userId}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) return JSON.parse(cached);

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

    await redisClient.set(cacheKey, result, 300);
    return result;
  }

  async getOrderById(orderId, userId) {
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) throw new AppError("Order not found", 404);
    return order;
  }

  async cancelOrder(orderId, userId) {
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) throw new AppError("Order not found", 404);
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
    const order = await Order.findById(data.orderId);
    if (!order) return;

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
  }

  async handlePaymentFailed(data) {
    const order = await Order.findById(data.orderId);
    if (!order) return;

    order.paymentStatus = "failed";
    order.status = ORDER_STATUS.FAILED;
    order.notes = data.reason || "Payment failed";
    await order.save();

    await redisClient.del(`orders:user:${order.userId}`);
  }

  async emitEvent(type, data) {
    try {
      await axios.post(
        `${process.env.EVENT_BUS_URL}/events`,
        { type, data },
        { timeout: 5000 }
      );
    } catch (error) {
      logger.error(`Failed to emit event ${type}`, error.message);
    }
  }
}

module.exports = new OrderService();
