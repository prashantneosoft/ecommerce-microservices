const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { auth, authorize } = require("shared/middleware/auth");
const { validate, schemas } = require("shared/middleware/validation");
const {
  standardLimiter,
  generousLimiter,
} = require("shared/middleware/rateLimiter");

router.get("/", generousLimiter, productController.getProducts);
router.get("/:id", generousLimiter, productController.getProduct);
router.post("/bulk", productController.getBulkProducts);

router.use(auth);
router.use(authorize("admin"));

router.post(
  "/",
  standardLimiter,
  validate(schemas.product),
  productController.createProduct
);
router.put(
  "/:id",
  standardLimiter,
  validate(schemas.product),
  productController.updateProduct
);
router.delete("/:id", productController.deleteProduct);

module.exports = router;
