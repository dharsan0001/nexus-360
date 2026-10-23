
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Every route in this file requires login.
router.use(protect);

// Only admins can access admin routes.
router.use((req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  next();
});

// GET /api/admin/users/pending
router.get("/users/pending", async (req, res) => {
  try {
    const users = await User.find({
      role: { $ne: "admin" },
      $or: [
        { approvalStatus: "pending" },
        { approvalStatus: { $exists: false } },
      ],
    })
      .select("_id name email role approvalStatus createdAt")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Pending users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load pending users.",
    });
  }
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find()
      .select(
        "_id name email role approvalStatus createdAt approvedAt rejectedAt"
      )
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Users list error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load users.",
    });
  }
});

// PATCH /api/admin/users/:id/approve
router.patch("/users/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin accounts cannot be changed here.",
      });
    }

    user.approvalStatus = "approved";
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    user.rejectedBy = null;
    user.rejectedAt = null;

    await user.save();

    return res.json({
      success: true,
      message: "User approved successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        approvedBy: req.user._id,
        approvedAt: user.approvedAt,
      },
    });
  } catch (error) {
    console.error("Approve user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to approve this user.",
    });
  }
});

// PATCH /api/admin/users/:id/reject
router.patch("/users/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin accounts cannot be changed here.",
      });
    }

    user.approvalStatus = "rejected";
    user.rejectedBy = req.user._id;
    user.rejectedAt = new Date();
    user.approvedBy = null;
    user.approvedAt = null;

    await user.save();

    return res.json({
      success: true,
      message: "User rejected.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        rejectedBy: req.user._id,
        rejectedAt: user.rejectedAt,
      },
    });
  } catch (error) {
    console.error("Reject user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reject this user.",
    });
  }
});

// PATCH /api/admin/users/:id/role
// Role changes do not automatically approve accounts.
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const allowedRoles = ["manager", "employee", "user"];

    if (typeof role !== "string" || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be manager, employee, or user.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin accounts cannot be changed here.",
      });
    }

    user.role = role;
    await user.save();

    return res.json({
      success: true,
      message: "User role updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update this user's role.",
    });
  }
});

module.exports = router;
