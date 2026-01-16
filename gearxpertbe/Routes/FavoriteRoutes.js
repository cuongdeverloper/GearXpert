const routerFavorite = require('express').Router();
const favoriteController = require('../controllers/Favorite/FavoriteController');
const { checkAccessToken } = require('../middleware/JWTAction');

// All routes require authentication
routerFavorite.post('/toggle', checkAccessToken, favoriteController.toggleFavorite);
routerFavorite.get('/', checkAccessToken, favoriteController.getUserFavorites);
routerFavorite.get('/check/:deviceId', checkAccessToken, favoriteController.checkIsFavorite);
routerFavorite.get('/list', checkAccessToken, favoriteController.getFavoriteDeviceIds);

module.exports = routerFavorite;
