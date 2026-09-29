const express = require('express');

const authenticate = require('../middleware/auth.middleware');

const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  expireQuotation,
  cancelQuotation,
  deleteQuotation,
  restoreQuotation,
  duplicateQuotation,
  getQuotationsSummary,
  expireOldQuotations,
} = require('../controllers/quotation.controller');

const router = express.Router();

router.use(authenticate);

/*
|--------------------------------------------------------------------------
| Main CRUD
|--------------------------------------------------------------------------
*/

router.post('/', createQuotation);

router.get('/', getQuotations);

router.get(
  '/summary',
  getQuotationsSummary
);

router.get(
  '/expire-old',
  expireOldQuotations
);

/*
|--------------------------------------------------------------------------
| Workflow
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/send',
  sendQuotation
);

router.post(
  '/:id/accept',
  acceptQuotation
);

router.post(
  '/:id/reject',
  rejectQuotation
);

router.post(
  '/:id/expire',
  expireQuotation
);

router.post(
  '/:id/cancel',
  cancelQuotation
);

/*
|--------------------------------------------------------------------------
| Duplicate
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/duplicate',
  duplicateQuotation
);

/*
|--------------------------------------------------------------------------
| Single quotation
|--------------------------------------------------------------------------
*/

router.get(
  '/:id',
  getQuotationById
);

router.put(
  '/:id',
  updateQuotation
);

/*
|--------------------------------------------------------------------------
| Delete / Restore
|--------------------------------------------------------------------------
*/

router.delete(
  '/:id',
  deleteQuotation
);

router.patch(
  '/:id/restore',
  restoreQuotation
);

module.exports = router;