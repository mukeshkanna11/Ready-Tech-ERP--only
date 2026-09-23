const express = require('express');

const companyController = require('../controllers/company.controller');

const authenticate = require('../middleware/auth.middleware');
const tenantScope = require('../middleware/tenant.middleware');

const router = express.Router();

/*
 * All company routes are protected.
 *
 * req.companyId from JWT represents the workspace / tenant ID.
 *
 * One workspace can contain multiple companies.
 */
router.use(authenticate, tenantScope);

/*
 * List all companies in the current workspace.
 *
 * GET /api/companies
 */
router.get('/', companyController.list);

/*
 * Get the current/default company in the workspace.
 *
 * Keep this before /:id.
 *
 * GET /api/companies/me
 */
router.get('/me', companyController.getCurrent);

/*
 * Create a new company inside the current workspace.
 *
 * POST /api/companies
 */
router.post('/', companyController.create);

/*
 * Get one company by its individual Company._id.
 *
 * Workspace ownership is verified inside the controller.
 *
 * GET /api/companies/:id
 */
router.get('/:id', companyController.getById);

/*
 * Update one company in the current workspace.
 *
 * PUT /api/companies/:id
 */
router.put('/:id', companyController.update);

/*
 * Soft-delete / deactivate a company.
 *
 * DELETE /api/companies/:id
 */
router.delete('/:id', companyController.remove);

/*
 * Restore a deactivated company.
 *
 * PATCH /api/companies/:id/restore
 */
router.patch('/:id/restore', companyController.restore);

module.exports = router;