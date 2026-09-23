const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    joiningDate: {
      type: Date,
    },

    employmentType: {
      type: String,
      enum: [
        "full_time",
        "part_time",
        "contract",
        "intern",
        "temporary",
      ],
      default: "full_time",
      index: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },

    dateOfBirth: {
      type: Date,
    },

    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed", "other"],
    },

    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    state: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    country: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "India",
    },

    postalCode: {
      type: String,
      trim: true,
      maxlength: 20,
    },

    emergencyContactName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    emergencyContactPhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    emergencyContactRelation: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One employee code per workspace.
 */
employeeSchema.index(
  { workspaceId: 1, employeeCode: 1 },
  { unique: true }
);

/*
 * One employee profile per user inside a workspace.
 */
employeeSchema.index(
  { workspaceId: 1, userId: 1 },
  { unique: true }
);

employeeSchema.index({
  workspaceId: 1,
  branchId: 1,
  status: 1,
});

employeeSchema.index({
  workspaceId: 1,
  employmentType: 1,
  status: 1,
});

module.exports = mongoose.model("Employee", employeeSchema);