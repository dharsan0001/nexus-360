
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const Lead = require("../models/Lead");
const Deal = require("../models/Deal");
const Task = require("../models/Task");

router.use(protect);

// Admins and managers can view all records.
// Employees and users can view only records they own.
function getAnalyticsAccessFilter(req) {
  if (["admin", "manager"].includes(req.user?.role)) {
    return {};
  }

  return { owner: req.user._id };
}

router.get("/", async (req, res) => {
  try {
    const accessFilter = getAnalyticsAccessFilter(req);

    const [leads, deals, tasks] = await Promise.all([
      Lead.find(accessFilter).lean(),
      Deal.find(accessFilter).lean(),
      Task.find(accessFilter).lean(),
    ]);

    const totalLeads = leads.length;
    const totalDeals = deals.length;
    const totalTasks = tasks.length;

    const convertedLeads = leads.filter((lead) =>
      ["converted", "won", "closed won"].includes(
        String(lead.status || "").toLowerCase()
      )
    ).length;

    const leadConversionRate =
      totalLeads > 0
        ? Number(((convertedLeads / totalLeads) * 100).toFixed(1))
        : 0;

    const wonDeals = deals.filter((deal) =>
      ["won", "closed won", "closed-won"].includes(
        String(deal.stage || deal.status || "").toLowerCase()
      )
    );

    const lostDeals = deals.filter((deal) =>
      ["lost", "closed lost", "closed-lost"].includes(
        String(deal.stage || deal.status || "").toLowerCase()
      )
    );

    const pipelineValue = deals
      .filter((deal) => {
        const stage = String(
          deal.stage || deal.status || ""
        ).toLowerCase();

        return ![
          "won",
          "closed won",
          "closed-won",
          "lost",
          "closed lost",
          "closed-lost",
        ].includes(stage);
      })
      .reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);

    const closedDeals = wonDeals.length + lostDeals.length;

    const winRate =
      closedDeals > 0
        ? Number(((wonDeals.length / closedDeals) * 100).toFixed(1))
        : 0;

    const completedTasks = tasks.filter((task) =>
      ["completed", "done"].includes(
        String(task.status || "").toLowerCase()
      )
    ).length;

    const pendingTasks = tasks.filter(
      (task) =>
        !["completed", "done", "cancelled", "canceled"].includes(
          String(task.status || "").toLowerCase()
        )
    ).length;

    const leadStatusCounts = {};

    for (const lead of leads) {
      const status = lead.status || "Unknown";
      leadStatusCounts[status] = (leadStatusCounts[status] || 0) + 1;
    }

    const dealStageCounts = {};

    for (const deal of deals) {
      const stage = deal.stage || deal.status || "Unknown";
      dealStageCounts[stage] = (dealStageCounts[stage] || 0) + 1;
    }

    const taskPriorityCounts = {};

    for (const task of tasks) {
      const priority = task.priority || "Unknown";
      taskPriorityCounts[priority] =
        (taskPriorityCounts[priority] || 0) + 1;
    }

    // Build the last six calendar months, including the current month.
    const monthlyActivity = [];
    const now = new Date();

    for (let offset = 5; offset >= 0; offset--) {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1
      );

      const nextMonthDate = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        1
      );

      const countCreatedThisMonth = (records) =>
        records.filter((record) => {
          if (!record.createdAt) return false;

          const createdAt = new Date(record.createdAt);

          return (
            !Number.isNaN(createdAt.getTime()) &&
            createdAt >= monthDate &&
            createdAt < nextMonthDate
          );
        }).length;

      monthlyActivity.push({
        month: monthDate.toLocaleString("en-US", {
          month: "short",
        }),
        year: monthDate.getFullYear(),
        leads: countCreatedThisMonth(leads),
        deals: countCreatedThisMonth(deals),
        tasks: countCreatedThisMonth(tasks),
      });
    }

    return res.status(200).json({
      metrics: {
        totalLeads,
        totalDeals,
        totalTasks,
        convertedLeads,
        leadConversionRate,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        pipelineValue,
        winRate,
        completedTasks,
        pendingTasks,
      },
      leadStatusCounts,
      dealStageCounts,
      taskPriorityCounts,
      monthlyActivity,
    });
  } catch (error) {
    console.error("Analytics error:", error);

    return res.status(500).json({
      message: "Unable to load dashboard analytics.",
    });
  }
});

module.exports = router;
