const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

// Email is unique per company, not globally.
userSchema.index({ companyId: 1, email: 1 }, { unique: true });

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const { password, __v, ...rest } = this.toObject();
  return rest;
};

module.exports = mongoose.model('User', userSchema);
