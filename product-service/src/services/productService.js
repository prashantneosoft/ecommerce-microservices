const Product = require("../models/Product");
const redisClient = require("shared/utils/redis");
const { AppError } = require("shared/middleware/errorHandler");
const { CACHE_TTL } = require("shared/utils/constants");

class ProductService {
  async createProduct(productData) {
    const existingProduct = await Product.findOne({ sku: productData.sku });

    if (existingProduct) {
      throw new AppError("Product with this SKU already exists", 400);
    }

    const product = await Product.create(productData);

    await redisClient.del("products:all");

    return product;
  }

  async getProducts(filters = {}, page = 1, limit = 20) {
    const cacheKey = `products:${JSON.stringify(filters)}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const query = { isActive: true };

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    const result = {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    await redisClient.set(cacheKey, JSON.stringify(result), CACHE_TTL.SHORT);

    return result;
  }

  async getProductById(id) {
    const cacheKey = `product:${id}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const product = await Product.findById(id);

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    await redisClient.set(cacheKey, JSON.stringify(product), CACHE_TTL.MEDIUM);

    return product;
  }

  async getProductsByIds(ids) {
    const products = await Product.find({ _id: { $in: ids } });
    return products;
  }

  async updateProduct(id, updateData) {
    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    await redisClient.del(`product:${id}`);
    await redisClient.del("products:all");

    return product;
  }

  async deleteProduct(id) {
    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    await redisClient.del(`product:${id}`);
    await redisClient.del("products:all");

    return product;
  }

  async updateStock(productId, quantity, operation = "decrease") {
    const product = await Product.findById(productId);

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (operation === "decrease") {
      if (product.stock < quantity) {
        throw new AppError("Insufficient stock", 400);
      }
      product.stock -= quantity;
    } else {
      product.stock += quantity;
    }

    await product.save();
    await redisClient.del(`product:${productId}`);

    return product;
  }
}

module.exports = new ProductService();
