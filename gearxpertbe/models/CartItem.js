const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart',
      required: true
    },

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true
    },

    quantity: {
      type: Number,
      min: 1,
      required: true
    },

    rentalStartDate: {
      type: Date,
      required: true
    },

    rentalEndDate: {
      type: Date,
      required: true
    },

    totalDays: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CartItem', cartItemSchema);
