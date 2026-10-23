
const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const priorities = ["Low", "Medium", "High"];
const statuses = ["Pending", "In Progress", "Completed"];

router.use(protect);

// Admins and managers can access every task.
// Employees and users can access only their own tasks.
function getTaskAccessFilter(req) {
  if (["admin", "manager"].includes(req.user?.role)) {
    return {};
  }

  return { owner: req.user._id };
}

// GET: Fetch accessible tasks.
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find(getTaskAccessFilter(req))
      .sort({ createdAt: -1 });

    return res.json({ tasks });
  } catch (error) {
    console.error("Fetch tasks error:", error);

    return res.status(500).json({
      message: "Unable to load tasks.",
    });
  }
});

// POST: Create a task owned by the logged-in user.
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      dueDate,
    } = req.body || {};

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required.",
      });
    }

    if (priority && !priorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid task priority.",
      });
    }

    if (status && !statuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid task status.",
      });
    }

    if (
      dueDate &&
      (typeof dueDate !== "string" ||
        Number.isNaN(Date.parse(dueDate)))
    ) {
      return res.status(400).json({
        message: "Invalid due date.",
      });
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be text.",
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || "",
      priority: priority || "Medium",
      status: status || "Pending",
      dueDate: dueDate || null,
      owner: req.user._id,
    });

    return res.status(201).json({ task });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(400).json({
      message: error.message || "Unable to create task.",
    });
  }
});

// PATCH: Update an accessible task.
router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid task ID.",
      });
    }

    const updates = {};

    for (const field of [
      "title",
      "description",
      "priority",
      "status",
      "dueDate",
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
        message: "Task title is required.",
      });
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (
      updates.description !== undefined &&
      typeof updates.description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be text.",
      });
    }

    if (
      updates.priority !== undefined &&
      !priorities.includes(updates.priority)
    ) {
      return res.status(400).json({
        message: "Invalid task priority.",
      });
    }

    if (
      updates.status !== undefined &&
      !statuses.includes(updates.status)
    ) {
      return res.status(400).json({
        message: "Invalid task status.",
      });
    }

    if (updates.dueDate !== undefined) {
      if (
        updates.dueDate !== null &&
        updates.dueDate !== "" &&
        (typeof updates.dueDate !== "string" ||
          Number.isNaN(Date.parse(updates.dueDate)))
      ) {
        return res.status(400).json({
          message: "Invalid due date.",
        });
      }

      if (updates.dueDate === "") {
        updates.dueDate = null;
      }
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        ...getTaskAccessFilter(req),
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.json({ task });
  } catch (error) {
    console.error("Update task error:", error);

    return res.status(400).json({
      message: error.message || "Unable to update task.",
    });
  }
});

// DELETE: Delete an accessible task.
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid task ID.",
      });
    }

    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      ...getTaskAccessFilter(req),
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.json({
      message: "Task deleted successfully.",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      message: "Unable to delete task.",
    });
  }
});

module.exports = router;
