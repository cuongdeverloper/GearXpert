    const routerCart = require('express').Router();
    const cartController = require('../controllers/Cart/CartController');
    const { checkAccessToken } = require('../middleware/JWTAction');

    routerCart.get('/', checkAccessToken, cartController.getCart);
    routerCart.post('/items', checkAccessToken, cartController.addToCart);
    routerCart.post('/instant', checkAccessToken, cartController.instantBuy);
    routerCart.delete('/items/:cartItemId', checkAccessToken, cartController.removeCartItem);
    routerCart.delete('/clear', checkAccessToken, cartController.clearCart);
    module.exports = routerCart;
