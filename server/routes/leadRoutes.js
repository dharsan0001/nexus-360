
const express = require("express");
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const allowedStatuses = [
  "New",
  "Contacted",
  "Qualified",
  "Won",
  "Lost",
];

function validateLeadFields(body, partial = false) {
  const { name, company, email, value, status } = body;

  if (!partial || name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return "A valid contact name is required.";
    }

    if (name.trim().length > 100) {
      return "Contact name must be 100 characters or fewer.";
    }
  }

  if (!partial || company !== undefined) {
    if (typeof company !== "string" || !company.trim()) {
      return "A valid company name is required.";
    }

    if (company.trim().length > 150) {
      return "Company name must be 150 characters or fewer.";
    }
  }

  if (email !== undefined && email !== "") {
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return "Enter a valid email address.";
    }
  }

  if (value !== undefined) {
    const amount = Number(value);

    if (
      value === "" ||
      value === null ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      return "Deal value must be a valid non-negative number.";
    }
  }

  if (
    status !== undefined &&
    !allowedStatuses.includes(status)
  ) {
    return "Choose a valid lead status.";
  }

  return null;
}

// GET: Fetch only the logged-in user's leads.
router.get("/", protect, async (req, res) => {
  try {
    const leads = await Lead.find({
      owner: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({ leads });
  } catch (error) {
    console.error("Fetch leads error:", error.message);

    res.status(500).json({
      message: "Unable to fetch leads.",
    });
  }
});

// POST: Create a new lead.
router.post("/", protect, async (req, res) => {
  try {
    const validationError = validateLeadFields(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const { name, company, email, value, status } = req.body;

    const lead = await Lead.create({
      name: name.trim(),
      company: company.trim(),
      email: email ? email.trim().toLowerCase() : "",
      value: value === undefined ? 0 : Number(value),
      status: status || "New",
      owner: req.user._id,
    });

    res.status(201).json({
      message: "Lead created successfully!",
      lead,
    });
  } catch (error) {
    console.error("Create lead error:", error.message);

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        message: "Invalid lead details.",
      });
    }

    res.status(500).json({
      message: "Unable to create lead.",
    });
  }
});

// PUT: Update a lead owned by the logged-in user.
router.put("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid lead ID.",
      });
    }

    const validationError = validateLeadFields(
      req.body,
      true
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const updates = {};
    const { name, company, email, value, status } = req.body;

    if (name !== undefined) updates.name = name.trim();
    if (company !== undefined) updates.company = company.trim();

    if (email !== undefined) {
      updates.email = email.trim().toLowerCase();
    }

    if (value !== undefined) {
      updates.value = Number(value);
    }

    if (status !== undefined) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    const lead = await Lead.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found.",
      });
    }

    res.json({
      message: "Lead updated successfully!",
      lead,
    });
  } catch (error) {
    console.error("Update lead error:", error.message);

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        message: "Invalid lead details.",
      });
    }

    res.status(500).json({
      message: "Unable to update lead.",
    });
  }
});

// DELETE: Delete a lead owned by the logged-in user.
router.delete("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid lead ID.",
      });
    }

    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found.",
      });
    }

    res.json({
      message: "Lead deleted successfully!",
      id: lead._id,
    });
  } catch (error) {
    console.error("Delete lead error:", error.message);

    res.status(500).json({
      message: "Unable to delete lead.",
    });
  }
});

module.exports = router;
