import axios from "../AxiosCustomize";


export const getSmartGearSuggestion = (data) => 
  axios.post(`/api/smartgear/suggest`, data);

export const addComboToCart = (data) => 
  axios.post(`/api/cart/combo`, data);

/**
 * AI Dynamic Pricing Suggestions for Supplier
 */
export const getAiDiscountSuggestions = () => {
    return axios.get("/api/smartgear/ai-suggestions");
};

/**
 * GET Active Discounts for Supplier
 */
export const getActiveDiscounts = () => {
    return axios.get("/api/smartgear/active-discounts");
};

/**
 * Apply AI Suggested Discount to a Device
 */
export const applyAiDiscount = (data) => {
    return axios.post("/api/smartgear/apply-discount", data);
};

/**
 * Remove/Cancel an Active Discount
 */
export const removeDiscount = (deviceId) => {
    return axios.delete(`/api/smartgear/remove-discount/${deviceId}`);
};