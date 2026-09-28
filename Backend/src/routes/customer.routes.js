const express = require('express');

const authenticate = require('../middleware/auth.middleware');


const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customer.controller');

const router = express.Router();

// All customer routes require authentication.
router.use(authenticate);

// Customer CRUD
router.post('/', createCustomer);

router.get('/', getCustomers);

router.get('/:id', getCustomerById);

router.put('/:id', updateCustomer);

router.delete('/:id', deleteCustomer);

module.exports = router;