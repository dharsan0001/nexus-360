
const express = require("express");
const mongoose = require("mongoose");
const Deal = require("../models/Deal");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const stages = [
  "Qualification",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

router.use(protect);

// Admins and managers can access every deal.
// Employees and users can access only their own deals.
function getDealAccessFilter(req) {
  if (["admin", "manager"].includes(req.user?.role)) {
    return {};
  }

  return { owner: req.user._id };
}

// GET: Fetch accessible deals.
router.get("/", async (req, res) => {
  try {
    const deals = await Deal.find(getDealAccessFilter(req))
      .sort({ createdAt: -1 });

    return res.json({ deals });
  } catch (error) {
    console.error("Fetch deals error:", error);

    return res.status(500).json({
      message: "Unable to load deals.",
    });
  }
});

// POST: Create a deal owned by the logged-in user.
router.post("/", async (req, res) => {
  try {
    const {
      title,
      company,
      value,
      stage,
      expectedCloseDate,
      notes,
    } = req.body || {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof company !== "string" ||
      !company.trim()
    ) {
      return res.status(400).json({
        message: "Deal title and company are required.",
      });
    }

    const amount = Number(value ?? 0);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        message: "Deal value must be non-negative.",
      });
    }

    if (stage && !stages.includes(stage)) {
      return res.status(400).json({
        message: "Invalid deal stage.",
      });
    }

    if (
      expectedCloseDate &&
      (typeof expectedCloseDate !== "string" ||
        Number.isNaN(Date.parse(expectedCloseDate)))
    ) {
      return res.status(400).json({
        message: "Invalid closing date.",
      });
    }

    if (notes !== undefined && typeof notes !== "string") {
      return res.status(400).json({
        message: "Notes must be text.",
      });
    }

    const deal = await Deal.create({
      title: title.trim(),
      company: company.trim(),
      value: amount,
      stage: stage || "Qualification",
      expectedCloseDate: expectedCloseDate || null,
      notes: notes || "",
      owner: req.user._id,
    });

    return res.status(201).json({ deal });
  } catch (error) {
    console.error("Create deal error:", error);

    return res.status(400).json({
      message: error.message || "Unable to create deal.",
    });
  }
});

// PATCH: Update an accessible deal.
router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid deal ID.",
      });
    }

    const updates = {};

    for (const field of [
      "title",
      "company",
      "value",
      "stage",
      "expectedCloseDate",
      "notes",
    ]) {
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
        message: "No valid fields provided to update.",
      });
    }

    if (
      updates.title !== undefined &&
      (typeof updates.title !== "string" ||
        !updates.title.trim())
    ) {
      return res.status(400).json({
        message: "Deal title is required.",
      });
    }

    if (
      updates.company !== undefined &&
      (typeof updates.company !== "string" ||
        !updates.company.trim())
    ) {
      return res.status(400).json({
        message: "Company is required.",
      });
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (updates.company !== undefined) {
      updates.company = updates.company.trim();
    }

    if (updates.value !== undefined) {
      updates.value = Number(updates.value);

      if (
        !Number.isFinite(updates.value) ||
        updates.value < 0
      ) {
        return res.status(400).json({
          message: "Invalid deal value.",
        });
      }
    }

    if (
      updates.stage !== undefined &&
      !stages.includes(updates.stage)
    ) {
      return res.status(400).json({
        message: "Invalid deal stage.",
      });
    }

    if (updates.expectedCloseDate !== undefined) {
      if (
        updates.expectedCloseDate !== null &&
        updates.expectedCloseDate !== "" &&
        (typeof updates.expectedCloseDate !== "string" ||
          Number.isNaN(Date.parse(updates.expectedCloseDate)))
      ) {
        return res.status(400).json({
          message: "Invalid closing date.",
        });
      }

      if (updates.expectedCloseDate === "") {
        updates.expectedCloseDate = null;
      }
    }

    if (
      updates.notes !== undefined &&
      typeof updates.notes !== "string"
    ) {
      return res.status(400).json({
        message: "Notes must be text.",
      });
    }

    const deal = await Deal.findOneAndUpdate(
      {
        _id: req.params.id,
        ...getDealAccessFilter(req),
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found.",
      });
    }

    return res.json({ deal });
  } catch (error) {
    console.error("Update deal error:", error);

    return res.status(400).json({
      message: error.message || "Unable to update deal.",
    });
  }
});

// DELETE: Delete an accessible deal.
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid deal ID.",
      });
    }

    const deal = await Deal.findOneAndDelete({
      _id: req.params.id,
      ...getDealAccessFilter(req),
    });

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found.",
      });
    }

    return res.json({
      message: "Deal deleted successfully.",
    });
  } catch (error) {
    console.error("Delete deal error:", error);

    return res.status(500).json({
      message: "Unable to delete deal.",
    });
  }
});

module.exports = router;
