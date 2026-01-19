import axios from "../AxiosCustomize"; // Hoặc đường dẫn đến file cấu hình axios của bạn

/**
 * Lấy thông tin ví của người dùng hiện tại
 * @returns {Promise} Trả về Object chứa balance, status...
 */
const getMyWallet = async () => {
    return axios.get("/api/wallets/me");
};

/**
 * Lấy lịch sử giao dịch ví
 * @returns {Promise} Trả về mảng các giao dịch
 */
const getWalletTransactions = async () => {
    return axios.get("/api/wallets/transactions");
};
const requestWithdraw = async (data) => {
    // data bao gồm { amount, bankInfo }
    return axios.post("/api/wallets/withdraw", data); 
};


/**
 * Tạo link nạp tiền qua PayOS
 * @param {number} amount Số tiền muốn nạp
 * @returns {Promise} Trả về link thanh toán từ PayOS
 */
const topUpWallet = async (amount) => {
    return axios.post("/api/wallets/topup", { amount });
};

export {
    getMyWallet,
    getWalletTransactions,
    topUpWallet,requestWithdraw
};