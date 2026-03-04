const routerBlog = require('express').Router();
const blogController = require('../controllers/Blog/BlogController');
const uploadCloud = require('../configs/cloudinaryConfig');

// Public routes — no auth needed
routerBlog.get('/', blogController.getBlogs);
routerBlog.get('/featured', blogController.getFeaturedBlog);
routerBlog.get('/categories', blogController.getBlogCategories);
routerBlog.get('/:id', blogController.getBlogDetail);
routerBlog.post('/', uploadCloud.array('images', 10), blogController.createBlog);

module.exports = routerBlog;
