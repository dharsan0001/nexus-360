
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Please log in first.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing.");

      return res.status(500).json({
        success: false,
        message: "Server authentication is not configured.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Token has no user ID. Please log in again.",
      });
    }

    const user = await User.findById(userId).select(
      "_id name email role approvalStatus"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found. Please log in again.",
      });
    }

    // Admin accounts can access protected routes.
    // Every other account must be explicitly approved.
    if (
      user.role !== "admin" &&
      user.approvalStatus !== "approved"
    ) {
      const status = user.approvalStatus || "pending";

      return res.status(403).json({
        success: false,
        approvalStatus: status,
        message:
          status === "rejected"
            ? "Your account was rejected by the Admin."
            : "Your account is waiting for Admin approval.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
}

module.exports = { protect };
