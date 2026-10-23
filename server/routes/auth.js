
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

function isValidEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= MAX_EMAIL_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function isValidPasswordLength(password) {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES
  );
}

// Create JWT token only when the server secret is configured.
function createToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim()) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    { sub: user._id.toString() },
    secret,
    { expiresIn: "7d" }
  );
}

// =========================
// REGISTER
// =========================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > MAX_NAME_LENGTH ||
      !isValidEmail(
        typeof email === "string" ? email.trim() : email
      ) ||
      !isValidPasswordLength(password)
    ) {
      return res.status(400).json({
        message:
          "Enter a valid name and email. Password must be at least 8 characters and no more than 72 UTF-8 bytes.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Never accept role or approval status from registration input.
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
      role: "user",
      approvalStatus: "pending",
    });

    return res.status(201).json({
      message:
        "Registration successful. Your account is waiting for Admin approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Unable to register right now.",
    });
  }
});

// =========================
// LOGIN
// =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      !isValidEmail(
        typeof email === "string" ? email.trim() : email
      ) ||
      typeof password !== "string" ||
      Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
    ) {
      return res.status(400).json({
        message: "Enter a valid email and password.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user || !user.password) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Admin accounts can log in without user approval.
    if (user.role !== "admin") {
      if (
        !user.approvalStatus ||
        user.approvalStatus === "pending"
      ) {
        return res.status(403).json({
          message: "Your account is waiting for Admin approval.",
        });
      }

      if (user.approvalStatus === "rejected") {
        return res.status(403).json({
          message: "Your account was rejected by the Admin.",
        });
      }

      if (user.approvalStatus !== "approved") {
        return res.status(403).json({
          message:
            "Your account is not approved to access Nexus 360.",
        });
      }
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in right now.",
    });
  }
});

// =========================
// CURRENT USER
// =========================
router.get("/me", protect, (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      approvalStatus: req.user.approvalStatus,
    },
  });
});

module.exports = router;
