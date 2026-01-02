const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { middleware } = require("@prashant-neosoft-ecommerce/shared");

const { validate, schemas } = middleware.validation;
const { auth } = middleware.auth;
const { strictLimiter, standardLimiter } = middleware.rateLimiter;

// Public routes with strict rate limiting
router.post(
  "/register",
  strictLimiter,
  validate(schemas.register),
  authController.register
);

router.post(
  "/login",
  strictLimiter,
  validate(schemas.login),
  authController.login
);

// Token refresh with standard rate limiting
router.post("/refresh", standardLimiter, authController.refresh);

// Protected routes
router.post("/logout", auth, authController.logout);
router.get("/verify", authController.verify);
router.get("/profile", auth, authController.getProfile);

module.exports = router;
