import axios from "../AxiosCustomize";

/**
 * Cart thường (Add to cart)
 */
const addToCart = (data) => {
    return axios.post("/api/carts/items", data);
};

/**
 * Mua ngay (Instant checkout)
 * → clear instant cart cũ + add 1 item
 */
const addInstantToCart = (data) => {
    return axios.post("/api/carts/instant", data);
};

/**
 * Lấy cart
 * type = NORMAL | INSTANT
 */
const getCart = (type = "NORMAL") => {
    return axios.get(`/api/carts?type=${type}`);
};

/**
 * Xóa item khỏi cart
 */
const removeCartItem = (itemId) => {
    return axios.delete(`/api/carts/items/${itemId}`);
};

/**
 * Clear cart
 */
const clearCart = (type = "NORMAL") => {
    return axios.delete(`/api/carts/clear?type=${type}`);
};

export {
    addToCart,
    addInstantToCart,
    getCart,
    removeCartItem,
    clearCart
};
