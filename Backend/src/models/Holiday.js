const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Holiday name is required"],
      trim: true,
      maxlength: 150,
    },

    date: {
      type: Date,
      required: [true, "Holiday date is required"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    holidayType: {
      type: String,
      enum: ["PUBLIC", "COMPANY", "OPTIONAL", "RESTRICTED"],
      default: "COMPANY",
      index: true,
    },

    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurringMonth: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },

    recurringDay: {
      type: Number,
      min: 1,
      max: 31,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ---------------------------------------------
// Indexes
// ---------------------------------------------

holidaySchema.index({
  workspaceId: 1,
  date: 1,
});

holidaySchema.index({
  workspaceId: 1,
  isActive: 1,
});

holidaySchema.index({
  workspaceId: 1,
  holidayType: 1,
});

holidaySchema.index({
  workspaceId: 1,
  name: 1,
});

// ---------------------------------------------
// Model
// ---------------------------------------------

const Holiday = mongoose.model("Holiday", holidaySchema);

module.exports = Holiday;