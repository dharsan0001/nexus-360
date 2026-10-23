
const express = require("express");
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const { protect: authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

const validStatuses = [
  "New",
  "Contacted",
  "Qualified",
  "Lost",
  "Converted",
];

router.use(authMiddleware);

// Validate the authenticated user ID.
function getOwnerId(req, res) {
  const ownerId = req.user?._id || req.user?.id;

  if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
    res.status(401).json({
      success: false,
      message: "Invalid or missing user ID. Please log in again.",
    });
    return null;
  }

  return new mongoose.Types.ObjectId(ownerId);
}

// Admins and managers can access every lead.
// Employees and users can access only their own leads.
function getLeadAccessFilter(req, ownerId) {
  if (["admin", "manager"].includes(req.user?.role)) {
    return {};
  }

  return { owner: ownerId };
}

// GET: Fetch accessible leads.
router.get("/", async (req, res) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const leads = await Lead.find(
      getLeadAccessFilter(req, ownerId)
    ).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error("Fetch leads error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
});

// POST: Create a lead owned by the logged-in user.
router.post("/", async (req, res) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const {
      name,
      email,
      phone,
      company,
      status,
    } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    if (
      status !== undefined &&
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead status",
      });
    }

    if (
      phone !== undefined &&
      typeof phone !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Phone must be text",
      });
    }

    if (
      company !== undefined &&
      typeof company !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Company must be text",
      });
    }

    const lead = await Lead.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: typeof phone === "string" ? phone.trim() : "",
      company: typeof company === "string" ? company.trim() : "",
      status: status || "New",
      owner: ownerId,
    });

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      lead,
    });
  } catch (error) {
    console.error("Create lead error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.name === "ValidationError"
          ? error.message
          : "Could not create lead",
    });
  }
});

// PATCH: Update a lead only if the user has access.
router.patch("/:id", async (req, res) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const allowedFields = [
      "name",
      "email",
      "phone",
      "company",
      "status",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body || {},
          field
        )
      ) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update",
      });
    }

    if (updates.name !== undefined) {
      if (
        typeof updates.name !== "string" ||
        !updates.name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      updates.name = updates.name.trim();
    }

    if (updates.email !== undefined) {
      if (
        typeof updates.email !== "string" ||
        !updates.email.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      updates.email = updates.email.trim().toLowerCase();
    }

    if (updates.company !== undefined) {
      if (typeof updates.company !== "string") {
        return res.status(400).json({
          success: false,
          message: "Company must be text",
        });
      }

      updates.company = updates.company.trim();
    }

    if (updates.phone !== undefined) {
      if (typeof updates.phone !== "string") {
        return res.status(400).json({
          success: false,
          message: "Phone must be text",
        });
      }

      updates.phone = updates.phone.trim();
    }

    if (
      updates.status !== undefined &&
      !validStatuses.includes(updates.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead status",
      });
    }

    const lead = await Lead.findOneAndUpdate(
      {
        _id: req.params.id,
        ...getLeadAccessFilter(req, ownerId),
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      lead,
    });
  } catch (error) {
    console.error("Update lead error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Could not update lead",
    });
  }
});

// DELETE: Delete a lead only if the user has access.
router.delete("/:id", async (req, res) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      ...getLeadAccessFilter(req, ownerId),
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Delete lead error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete lead",
    });
  }
});

module.exports = router;
