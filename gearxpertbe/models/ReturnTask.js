const mongoose = require("mongoose");

const returnTaskSchema = new mongoose.Schema(
  {
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },

    deviceIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device"
    }],

    returnStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User" // OPERATION_STAFF
    },

    status: {
      type: String,
      enum: ['PENDING', 'IN_TRANSIT', 'RECEIVED', 'FAILED'],
      default: 'PENDING'
    },

    scheduledAt: Date,
    receivedAt: Date,

    location: String, // nơi nhận trả

    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReturnTask', returnTaskSchema);