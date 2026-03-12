const routerBlog = require('express').Router();
const blogController = require('../controllers/Blog/BlogController');
const uploadCloud = require('../configs/cloudinaryConfig');

// Public routes — no auth needed
routerBlog.get('/', blogController.getBlogs);
routerBlog.get('/featured', blogController.getFeaturedBlog);
routerBlog.get('/categories', blogController.getBlogCategories);
routerBlog.get('/:id', blogController.getBlogDetail);
routerBlog.post('/', uploadCloud.array('images', 10), blogController.createBlog);
routerBlog.put('/:id', uploadCloud.array('images', 10), blogController.updateBlog);
routerBlog.delete('/:id', blogController.deleteBlog);
routerBlog.post('/:id/save', blogController.toggleSaveBlog);
routerBlog.patch('/:id/status', blogController.manageBlogStatus);

module.exports = routerBlog;
