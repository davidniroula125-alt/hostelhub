const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    product: { type: String, required: true, trim: true },
    category: { type: String, default: 'other' },
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'pcs' },
    purchasePrice: { type: Number, default: 0, min: 0 },
    supplier: { type: String, trim: true },
    location: { type: String, trim: true },
    lowStockThreshold: { type: Number, default: 0 },
    openingStock: { type: Number, default: 0 }
  },
  { timestamps: true }
);

inventorySchema.index({ hostel: 1, product: 1 }, { unique: true });

const inventoryTxSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    inventory: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true, index: true },
    type: { type: String, enum: ['in', 'out', 'adjust', 'opening'], required: true },
    quantity: { type: Number, required: true },
    reason: { type: String },
    cost: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

inventoryTxSchema.index({ hostel: 1, inventory: 1, date: 1 });

module.exports = {
  Inventory: mongoose.model('Inventory', inventorySchema),
  InventoryTransaction: mongoose.model('InventoryTransaction', inventoryTxSchema)
};