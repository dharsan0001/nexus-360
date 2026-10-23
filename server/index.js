
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 5000;

// Configure allowed frontend origins using FRONTEND_URLS.
// Separate multiple origins with commas.
const allowedOrigins = new Set(
  (process.env.FRONTEND_URLS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean)
);

// Allow common local development origins outside production.
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://127.0.0.1:5173");
}

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header can include local
      // scripts and server-to-server requests.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // Browser requests from unapproved origins receive no
      // CORS permission. This is not a replacement for auth.
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// Limit JSON request bodies to reduce oversized payload abuse.
app.use(express.json({ limit: "100kb" }));

// Limit requests to authentication endpoints.
// This is an in-memory limiter, suitable for a single server
// instance; multi-instance deployments need a shared store.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests. Please try again later.",
  },
});

// Health and root endpoints
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Nexus 360 API!" });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

// Register all API routes
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/leads", require("./routes/leads"));
app.use("/api/deals", require("./routes/dealRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Handle unknown routes without exposing server internals.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from the root .env file");
    }

    if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
      throw new Error("JWT_SECRET is missing from the root .env file");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exitCode = 1;
  }
}

startServer();
