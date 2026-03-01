const routerBlog = require('express').Router();
const blogController = require('../controllers/Blog/BlogController');

// Public routes — no auth needed
routerBlog.get('/', blogController.getBlogs);
routerBlog.get('/featured', blogController.getFeaturedBlog);
routerBlog.get('/categories', blogController.getBlogCategories);
routerBlog.get('/:id', blogController.getBlogDetail);

module.exports = routerBlog;
