const express = require('express');

const branchController = require('../controllers/branch.controller');

const authenticate = require('../middleware/auth.middleware');
const tenantScope = require('../middleware/tenant.middleware');

const router = express.Router();

/*
 * All branch routes are protected.
 *
 * authenticate:
 *   Validates JWT and sets req.userId / req.companyId.
 *
 * tenantScope:
 *   Validates req.companyId as the current workspace / tenant.
 *
 * req.companyId = workspace ID
 * Branch.companyId = actual Company._id
 */
router.use(authenticate, tenantScope);

/*
 * Create a branch inside a company
 * belonging to the current workspace.
 *
 * POST /api/branches
 *
 * companyId must be provided in the request body.
 */
router.post('/', branchController.create);

/*
 * List branches for a company.
 *
 * GET /api/branches?companyId=COMPANY_ID
 *
 * Optional:
 * ?status=active
 * ?status=inactive
 * ?search=branch
 * ?page=1
 * ?limit=20
 */
router.get('/', branchController.list);

/*
 * Get one branch by its Branch._id.
 *
 * Workspace ownership is verified by the controller.
 *
 * GET /api/branches/:id
 */
router.get('/:id', branchController.getById);

/*
 * Update one branch.
 *
 * PUT /api/branches/:id
 */
router.put('/:id', branchController.update);

/*
 * Soft-delete / deactivate a branch.
 *
 * DELETE /api/branches/:id
 */
router.delete('/:id', branchController.remove);

/*
 * Restore a deactivated branch.
 *
 * PATCH /api/branches/:id/restore
 */
router.patch('/:id/restore', branchController.restore);

module.exports = router;