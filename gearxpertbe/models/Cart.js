const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    cartType: {
      type: String,
      enum: ['NORMAL', 'INSTANT'],
      default: 'NORMAL'
    },

    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CartItem'
      }
    ]
  },
  { timestamps: true }
);

cartSchema.index({ customerId: 1, cartType: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);
