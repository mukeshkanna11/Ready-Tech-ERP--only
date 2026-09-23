const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Current workspace / tenant ID.
    // Existing authentication already uses user.companyId
    // as the workspace reference.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      index: true,
    },

    department: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    designation: {
      type: String,
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

    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;

        return ret;
      },
    },

    toObject: {
      virtuals: true,
    },
  }
);

/*
 * Email must be unique inside the workspace.
 *
 * Same email can technically exist in different
 * workspaces, but not twice inside the same workspace.
 */
userSchema.index(
  {
    companyId: 1,
    email: 1,
  },
  {
    unique: true,
  }
);

/*
 * Faster workspace user listing.
 */
userSchema.index({
  companyId: 1,
  createdAt: -1,
});

/*
 * Faster filtering by workspace + status.
 */
userSchema.index({
  companyId: 1,
  status: 1,
});

/*
 * Faster role-based user queries.
 */
userSchema.index({
  companyId: 1,
  role: 1,
});

/*
 * Return a safe user object.
 *
 * Password is never exposed.
 */
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const user = this.toObject();

  delete user.password;
  delete user.__v;

  return user;
};

module.exports = mongoose.model('User', userSchema);