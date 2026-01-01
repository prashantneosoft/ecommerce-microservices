const productService = require("../services/productService");
const { asyncHandler } = require("../../../shared/middleware/errorHandler");

exports.createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);

  res.status(201).json({
    success: true,
    data: product,
  });
});

exports.getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, ...filters } = req.query;
  const result = await productService.getProducts(
    filters,
    parseInt(page),
    parseInt(limit)
  );

  res.json({
    success: true,
    data: result.products,
    pagination: result.pagination,
  });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  res.json({
    success: true,
    data: product,
  });
});

exports.getBulkProducts = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const products = await productService.getProductsByIds(ids);

  res.json({
    success: true,
    data: products,
  });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);

  res.json({
    success: true,
    data: product,
  });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await productService.deleteProduct(req.params.id);

  res.json({
    success: true,
    data: product,
  });
});
