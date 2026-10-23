
const express = require("express");
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const statuses = ["Active", "Inactive"];

const editableFields = [
  "name",
  "company",
  "email",
  "phone",
  "address",
  "status",
  "notes",
];

router.use(protect);

// Validate the authenticated user's ID.
function getOwnerId(req, res) {
  const ownerId = req.user?._id || req.user?.id;

  if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
    res.status(401).json({
      success: false,
      message: "Invalid user. Please log in again.",
    });
    return null;
  }

  return ownerId;
}

// Admins and managers can access every customer.
// Employees and users can access only their own customers.
function getCustomerAccessFilter(req, ownerId) {
  if (["admin", "manager"].includes(req.user?.role)) {
    return {};
  }

  return { owner: ownerId };
}

// GET: List accessible customers.
router.get("/", async (req, res) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const customers = await Customer.find(
      getCustomerAccessFilter(req, ownerId)
    ).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: customers.length,
      customers,
    });
  } catch (error) {
    console.error("Fetch customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers.",
    });
  }
});

// POST: Create a customer owned by the logged-in user.
router.post("/", async (req, res) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const body = req.body || {};

    if (
      typeof body.name !== "string" ||
      !body.name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }

    for (const field of [
      "company",
      "email",
      "phone",
      "address",
      "notes",
    ]) {
      if (
        body[field] !== undefined &&
        typeof body[field] !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be text.`,
        });
      }
    }

    if (
      body.status !== undefined &&
      !statuses.includes(body.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer status.",
      });
    }

    const customer = await Customer.create({
      name: body.name.trim(),
      company:
        typeof body.company === "string"
          ? body.company.trim()
          : "",
      email:
        typeof body.email === "string"
          ? body.email.trim().toLowerCase()
          : "",
      phone:
        typeof body.phone === "string"
          ? body.phone.trim()
          : "",
      address:
        typeof body.address === "string"
          ? body.address.trim()
          : "",
      notes:
        typeof body.notes === "string"
          ? body.notes.trim()
          : "",
      status: body.status || "Active",
      owner: ownerId,
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Could not create customer.",
    });
  }
});

// PATCH: Update an accessible customer.
router.patch("/:id", async (req, res) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const updates = {};

    for (const field of editableFields) {
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
        message: "No valid fields provided to update.",
      });
    }

    for (const field of [
      "name",
      "company",
      "email",
      "phone",
      "address",
      "notes",
    ]) {
      if (updates[field] !== undefined) {
        if (typeof updates[field] !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field} must be text.`,
          });
        }

        updates[field] = updates[field].trim();
      }
    }

    if (updates.name !== undefined && !updates.name) {
      return res.status(400).json({
        success: false,
        message: "Customer name cannot be empty.",
      });
    }

    if (updates.email !== undefined) {
      updates.email = updates.email.toLowerCase();
    }

    if (
      updates.status !== undefined &&
      !statuses.includes(updates.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer status.",
      });
    }

    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        ...getCustomerAccessFilter(req, ownerId),
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Could not update customer.",
    });
  }
});

// DELETE: Delete an accessible customer.
router.delete("/:id", async (req, res) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      ...getCustomerAccessFilter(req, ownerId),
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer.",
    });
  }
});

module.exports = router;
