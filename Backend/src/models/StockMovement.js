const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    /*
     * ERP workspace/company isolation key.
     * Comes from req.companyId through the authenticated JWT.
     */
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    /*
     * Physical branch/location.
     * null = workspace-level/common stock.
     */
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },

    /*
     * Inventory master record.
     */
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
      index: true,
    },

    /*
     * Product master reference.
     */
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    /*
     * Type of stock movement.
     */
    movementType: {
      type: String,
      enum: [
        'opening',
        'purchase',
        'purchase_return',
        'sale',
        'sales_return',
        'adjustment_in',
        'adjustment_out',
        'transfer_in',
        'transfer_out',
        'reservation',
        'release',
      ],
      required: true,
      index: true,
    },

    /*
     * Stock movement direction.
     */
    direction: {
      type: String,
      enum: ['in', 'out', 'neutral'],
      required: true,
      index: true,
    },

    /*
     * Quantity involved in this movement.
     */
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
     * Stock quantity before movement.
     */
    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    /*
     * Stock quantity after movement.
     */
    newQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    /*
     * Reserved quantity before movement.
     */
    previousReserved: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
     * Reserved quantity after movement.
     */
    newReserved: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
     * Unit cost at the time of movement.
     */
    unitCost: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
     * Source/reference category.
     *
     * Examples:
     * purchase
     * sale
     * opening_stock
     * manual_adjustment
     * transfer
     */
    referenceType: {
      type: String,
      trim: true,
      default: '',
    },

    /*
     * External reference number.
     *
     * Examples:
     * PO-0001
     * SO-0001
     * ADJ-0001
     */
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },

    /*
     * Human-readable reason for movement.
     */
    reason: {
      type: String,
      trim: true,
      default: '',
    },

    /*
     * Optional additional notes.
     */
    notes: {
      type: String,
      trim: true,
      default: '',
    },

    /*
     * User who performed the movement.
     */
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /*
     * Actual date/time of stock movement.
     */
    movementDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Stock movement history must NOT be unique by
 * company + product + branch.
 *
 * The same product/branch can have unlimited movements:
 *
 * opening
 * purchase
 * adjustment
 * sale
 * transfer
 * etc.
 */

/*
 * Inventory movement history.
 */
stockMovementSchema.index({
  companyId: 1,
  inventoryId: 1,
  movementDate: -1,
});

/*
 * Product movement history.
 */
stockMovementSchema.index({
  companyId: 1,
  productId: 1,
  movementDate: -1,
});

/*
 * Branch movement history.
 */
stockMovementSchema.index({
  companyId: 1,
  branchId: 1,
  movementDate: -1,
});

/*
 * Useful filtering index.
 */
stockMovementSchema.index({
  companyId: 1,
  movementType: 1,
  movementDate: -1,
});

/*
 * Prevent OverwriteModelError during development/hot reload.
 */
module.exports =
  mongoose.models.StockMovement ||
  mongoose.model('StockMovement', stockMovementSchema);