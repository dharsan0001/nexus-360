const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    stage: {
      type: String,
      enum: ["Qualification", "Proposal", "Negotiation", "Won", "Lost"],
      default: "Qualification",
    },
    expectedCloseDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deal", dealSchema);
