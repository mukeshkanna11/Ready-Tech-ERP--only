const mongoose = require("mongoose");

const performanceSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    reviewPeriodStart: {
      type: Date,
      required: true,
      index: true,
    },

    reviewPeriodEnd: {
      type: Date,
      required: true,
      index: true,
    },

    reviewType: {
      type: String,
      enum: [
        "monthly",
        "quarterly",
        "half_yearly",
        "annual",
        "probation",
        "project",
        "other",
      ],
      default: "quarterly",
      index: true,
    },

    goals: [
      {
        title: {
          type: String,
          trim: true,
          required: true,
          maxlength: 200,
        },

        description: {
          type: String,
          trim: true,
          maxlength: 1000,
          default: "",
        },

        target: {
          type: String,
          trim: true,
          maxlength: 500,
          default: "",
        },

        achievement: {
          type: String,
          trim: true,
          maxlength: 1000,
          default: "",
        },

        rating: {
          type: Number,
          min: 1,
          max: 5,
          default: null,
        },

        weight: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
      },
    ],

    skills: [
      {
        name: {
          type: String,
          trim: true,
          required: true,
          maxlength: 100,
        },

        rating: {
          type: Number,
          min: 1,
          max: 5,
          default: null,
        },

        comments: {
          type: String,
          trim: true,
          maxlength: 500,
          default: "",
        },
      },
    ],

    strengths: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    areasOfImprovement: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    achievements: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    managerComments: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    employeeComments: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    overallRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "reviewed",
        "approved",
        "closed",
      ],
      default: "draft",
      index: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
  }
);

performanceSchema.index({
  workspaceId: 1,
  employeeId: 1,
  reviewPeriodStart: -1,
});

performanceSchema.index({
  workspaceId: 1,
  employeeId: 1,
  reviewPeriodEnd: -1,
});

performanceSchema.index({
  workspaceId: 1,
  status: 1,
  reviewPeriodEnd: -1,
});

performanceSchema.index({
  workspaceId: 1,
  reviewType: 1,
  reviewPeriodEnd: -1,
});

module.exports = mongoose.model(
  "Performance",
  performanceSchema
);