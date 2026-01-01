module.exports = {
  EVENTS: {
    ORDER_CREATED: "OrderCreated",
    ORDER_UPDATED: "OrderUpdated",
    ORDER_CANCELLED: "OrderCancelled",
    PAYMENT_PROCESSED: "PaymentProcessed",
    PAYMENT_FAILED: "PaymentFailed",
    PAYMENT_REFUNDED: "PaymentRefunded",
    INVENTORY_RESERVED: "InventoryReserved",
    INVENTORY_RELEASED: "InventoryReleased",
  },

  ORDER_STATUS: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    FAILED: "failed",
  },

  PAYMENT_STATUS: {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
    REFUNDED: "refunded",
  },

  USER_ROLES: {
    USER: "user",
    ADMIN: "admin",
  },

  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
  },
};
