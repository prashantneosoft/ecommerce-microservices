const jwt = require("jsonwebtoken");
const redisClient = require("../utils/redis");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const cachedUser = await redisClient.get(`user:${decoded.userId}`);
    if (!cachedUser) {
      return res.status(401).json({ error: "Session expired" });
    }

    req.user = JSON.parse(cachedUser);
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid authentication token" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Access denied. Insufficient permissions.",
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
