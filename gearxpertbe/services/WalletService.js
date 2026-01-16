const Wallet = require('../models/Wallet');

/**
 * Ensures a user has a wallet. If not, creates one.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} The wallet document.
 */
const ensureUserWallet = async (userId) => {
    try {
        // Check if wallet already exists
        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
            // Create new wallet if it doesn't exist
            wallet = new Wallet({
                user: userId,
                balance: 0,
                currency: 'VND',
                status: 'ACTIVE'
            });
            await wallet.save();
            console.log(`✅ Wallet created for user: ${userId}`);
        }

        return wallet;
    } catch (error) {
        console.error(`❌ Error ensuring wallet for user ${userId}:`, error);
        throw error;
    }
};

module.exports = {
    ensureUserWallet
};
