const mongoose = require("mongoose");

const smartGearSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      index: true 
    },
    description: String,
    
    tags: [String], 


    requiredCategories: [
      {
        category: { type: String }, 
        quantity: { type: Number, default: 1 },
        importance: { type: String, enum: ["MUST_HAVE", "NICE_TO_HAVE"] }
      }
    ],

    priceTiers: {
      budget: { maxTotalPerDay: Number },
      standard: { maxTotalPerDay: Number },
      premium: { minTotalPerDay: Number }
    },

    status: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SmartGear", smartGearSchema);