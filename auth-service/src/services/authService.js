const jwt = require("jsonwebtoken");
const User = require("../models/User");
const redisClient = require("shared/utils/redis");
const { AppError } = require("shared/middleware/errorHandler");

class AuthService {
  generateAccessToken(userId, role) {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
  }

  generateRefreshToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
  }

  async register(userData) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError("Email already registered", 400);
    }

    const user = await User.create(userData);
    const accessToken = this.generateAccessToken(user._id, user.role);
    const refreshToken = this.generateRefreshToken(user._id);

    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    await redisClient.set(
      `user:${user._id}`,
      JSON.stringify({ userId: user._id, role: user.role }),
      900
    );

    return { user, accessToken, refreshToken };
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      throw new AppError("Invalid credentials", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account is disabled", 403);
    }

    const accessToken = this.generateAccessToken(user._id, user.role);
    const refreshToken = this.generateRefreshToken(user._id);

    user.refreshTokens.push({ token: refreshToken });
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();

    await redisClient.set(
      `user:${user._id}`,
      JSON.stringify({ userId: user._id, role: user.role }),
      900
    );

    user.password = undefined;
    return { user, accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AppError("Invalid refresh token", 401);
      }

      const tokenExists = user.refreshTokens.some(
        (t) => t.token === refreshToken
      );
      if (!tokenExists) {
        throw new AppError("Invalid refresh token", 401);
      }

      const newAccessToken = this.generateAccessToken(user._id, user.role);

      await redisClient.set(
        `user:${user._id}`,
        JSON.stringify({ userId: user._id, role: user.role }),
        900
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new AppError("Invalid refresh token", 401);
    }
  }

  async logout(userId, refreshToken) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(
        (t) => t.token !== refreshToken
      );
      await user.save();
    }

    await redisClient.del(`user:${userId}`);
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const cached = await redisClient.get(`user:${decoded.userId}`);

      if (!cached) {
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
          throw new AppError("User not found or inactive", 401);
        }

        await redisClient.set(
          `user:${decoded.userId}`,
          JSON.stringify({ userId: user._id, role: user.role }),
          900
        );

        return { userId: user._id, role: user.role };
      }

      return JSON.parse(cached);
    } catch (error) {
      throw new AppError("Invalid token", 401);
    }
  }
}

module.exports = new AuthService();
