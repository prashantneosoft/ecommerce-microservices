const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { middleware } = require("@prashant-neosoft-ecommerce/shared");

const { auth, authorize } = middleware.auth;
const { validate, schemas } = middleware.validation;
const { standardLimiter, generousLimiter } = middleware.rateLimiter;

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
