const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');

console.log('Script started');
async function migrate() {
  console.log('Migrate function called');
  try {
    console.log('Connecting to', process.env.DB_HOST);
    await mongoose.connect(process.env.DB_HOST);
    console.log('Connected to MongoDB');

    const adminWallet = await Wallet.findOne({ isSystem: true });
    if (!adminWallet) {
      console.log('No system wallet found.');
      process.exit(0);
    }

    console.log(`System Wallet Balance: ${adminWallet.balance}`);

    // Calculate pending escrow
    const escrowHolds = await WalletTransaction.aggregate([
      { $match: { wallet: adminWallet._id, type: { $in: ["ESCROW_HOLD", "ESCROW_RELEASE"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    // Calculate pending deposits
    const depositHolds = await WalletTransaction.aggregate([
      { $match: { wallet: adminWallet._id, type: { $in: ["DEPOSIT_HOLD", "DEPOSIT_RELEASE"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const pendingEscrow = Math.max(0, escrowHolds[0]?.total || 0);
    const pendingDeposits = Math.max(0, depositHolds[0]?.total || 0);
    
    // availableBalance = balance - (money we are holding for others)
    const availableBalance = Math.max(0, adminWallet.balance - pendingEscrow - pendingDeposits);

    console.log(`Calculated Available Balance: ${availableBalance}`);
    console.log(`(Total ${adminWallet.balance} - Escrow ${pendingEscrow} - Deposits ${pendingDeposits})`);

    adminWallet.availableBalance = availableBalance;
    await adminWallet.save();

    console.log('Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
