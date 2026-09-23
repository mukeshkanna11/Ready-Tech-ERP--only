const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    // Workspace/tenant that owns this department. req.companyId from the JWT.
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
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

// Department name is unique inside one workspace, not globally.
departmentSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
