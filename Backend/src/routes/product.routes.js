const express = require('express');

const authenticate = require('../middleware/auth.middleware');

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  restoreProduct,
} = require('../controllers/product.controller');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  createProduct
);

router.get(
  '/',
  getProducts
);

router.get(
  '/:id',
  getProductById
);

router.put(
  '/:id',
  updateProduct
);

router.delete(
  '/:id',
  deleteProduct
);

router.patch(
  '/:id/restore',
  restoreProduct
);

module.exports = router;