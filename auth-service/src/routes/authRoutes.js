const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validate, schemas } = require("shared/middleware/validation");
const { auth } = require("shared/middleware/auth");
const {
  standardLimiter,
  strictLimiter,
} = require("shared/middleware/rateLimiter");

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
router.post("/refresh", standardLimiter, authController.refresh);
router.post("/logout", auth, authController.logout);
router.get("/verify", authController.verify);
router.get("/profile", auth, authController.getProfile);

module.exports = router;
