const mongoose = require("mongoose");

const earningSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    type: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    percentageOf: {
      type: String,
      enum: [
        "basic",
        "gross",
        "none",
      ],
      default: "none",
    },

    isTaxable: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

const deductionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    type: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    percentageOf: {
      type: String,
      enum: [
        "basic",
        "gross",
        "none",
      ],
      default: "none",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

const salaryStructureSchema =
  new mongoose.Schema(
    {
      workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 50,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },

      payFrequency: {
        type: String,
        enum: [
          "monthly",
          "weekly",
          "bi_weekly",
          "daily",
          "yearly",
        ],
        default: "monthly",
        index: true,
      },

      currency: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 10,
        default: "INR",
      },

      basicSalary: {
        type: Number,
        required: true,
        min: 0,
      },

      basicSalaryType: {
        type: String,
        enum: ["fixed", "percentage"],
        default: "fixed",
      },

      basicSalaryPercentageOf: {
        type: String,
        enum: ["ctc", "gross", "none"],
        default: "none",
      },

      earnings: {
        type: [earningSchema],
        default: [],
      },

      deductions: {
        type: [deductionSchema],
        default: [],
      },

      employerContributions: {
        type: [deductionSchema],
        default: [],
      },

      effectiveFrom: {
        type: Date,
        required: true,
        index: true,
      },

      effectiveTo: {
        type: Date,
        default: null,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: "",
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

salaryStructureSchema.index(
  {
    workspaceId: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

salaryStructureSchema.index({
  workspaceId: 1,
  isActive: 1,
  effectiveFrom: -1,
});

salaryStructureSchema.index({
  workspaceId: 1,
  payFrequency: 1,
  isActive: 1,
});

module.exports = mongoose.model(
  "SalaryStructure",
  salaryStructureSchema
);