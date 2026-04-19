/**
 * Migration script to add isEarned, isRefunded, rentalStatus fields
 * to old PLATFORM_FEE transactions that don't have these fields
 */

const mongoose = require('mongoose');
const WalletTransaction = require('../models/WalletTransaction');
const Rental = require('../models/Rental');

async function migrate() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gearxpert');
    console.log('Connected to database');

    // Find all PLATFORM_FEE transactions without isEarned field
    const oldFees = await WalletTransaction.find({
      type: 'PLATFORM_FEE',
      isEarned: { $exists: false }
    });

    console.log(`Found ${oldFees.length} PLATFORM_FEE transactions to migrate`);

    let updated = 0;
    let errors = 0;

    for (const fee of oldFees) {
      try {
        // Check if there's a corresponding PLATFORM_FEE_REFUND
        const refund = await WalletTransaction.findOne({
          type: 'PLATFORM_FEE_REFUND',
          referenceType: 'RENTAL',
          referenceId: fee.referenceId
        });

        // Get rental status
        const rental = await Rental.findById(fee.referenceId);
        const rentalStatus = rental ? rental.status : 'PENDING';

        let updateData = {
          rentalStatus: rentalStatus,
          isEarned: false,
          isRefunded: false
        };

        if (refund) {
          // Has refund -> mark as refunded
          updateData.isRefunded = true;
          updateData.isEarned = false;
        } else if (rentalStatus === 'COMPLETED') {
          // No refund and rental completed -> mark as earned
          updateData.isEarned = true;
          updateData.isRefunded = false;
        } else if (rentalStatus === 'CANCELLED') {
          // Cancelled but no refund record -> mark as refunded anyway
          updateData.isRefunded = true;
          updateData.isEarned = false;
        }
        // PENDING status keeps default values

        await WalletTransaction.updateOne(
          { _id: fee._id },
          { $set: updateData }
        );

        console.log(`Updated fee ${fee._id}: rentalStatus=${updateData.rentalStatus}, isEarned=${updateData.isEarned}, isRefunded=${updateData.isRefunded}`);
        updated++;
      } catch (err) {
        console.error(`Error updating fee ${fee._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\nMigration complete:`);
    console.log(`- Updated: ${updated}`);
    console.log(`- Errors: ${errors}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
