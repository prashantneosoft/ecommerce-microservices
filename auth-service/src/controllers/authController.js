const authService = require("../services/authService");
const { asyncHandler } = require("shared/middleware/errorHandler");

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);

  res.json({
    success: true,
    data: result,
  });
});

exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(req.user.userId, refreshToken);

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

exports.verify = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  const result = await authService.verifyToken(token);

  res.json({
    success: true,
    data: result,
  });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const User = require("../models/User");
  const user = await User.findById(req.user.userId);

  res.json({
    success: true,
    data: user,
  });
});
