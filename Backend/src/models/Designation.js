const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
  {
    // Workspace/tenant that owns this designation. req.companyId from the JWT.
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    // Department this designation belongs to, inside the same workspace.
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Designation name is unique inside one workspace, not globally.
designationSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

// Fast department-scoped listing.
designationSchema.index({ workspaceId: 1, departmentId: 1, status: 1 });

module.exports = mongoose.model('Designation', designationSchema);
