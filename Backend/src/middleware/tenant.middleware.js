const mongoose = require('mongoose');

const tenantScope = (req, res, next) => {
  try {
    // authenticate middleware must run before tenantScope.
    // authenticate sets:
    // req.userId
    // req.companyId -> workspace / tenant ID
    // req.roleId

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const workspaceId = req.companyId;

    if (!workspaceId) {
      return res.status(403).json({
        success: false,
        message: 'No workspace is linked to this account',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid workspace reference',
      });
    }

    // Normalize for all downstream controllers.
    req.companyId = workspaceId.toString();

    return next();
  } catch (error) {
    console.error('Tenant scope error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to resolve workspace access',
    });
  }
};

module.exports = tenantScope;