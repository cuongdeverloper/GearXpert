const routerCart = require("express").Router();
const cartController = require("../controllers/Cart/CartController");
const { checkAccessToken } = require("../middleware/JWTAction");

routerCart.get("/", checkAccessToken, cartController.getCart);
routerCart.post("/items", checkAccessToken, cartController.addToCart);
routerCart.post("/instant", checkAccessToken, cartController.addInstantToCart);
routerCart.delete(
  "/items/:cartItemId",
  checkAccessToken,
  cartController.removeCartItem
);
routerCart.delete("/clear", checkAccessToken, cartController.clearCart);
routerCart.post("/combo", checkAccessToken, cartController.addComboToCart);
// Thêm dòng này vào router
routerCart.put(
  "/items/:cartItemId",
  checkAccessToken,
  cartController.updateCartItem
);
module.exports = routerCart;
