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
routerBlog.post('/:id/like', blogController.toggleLikeBlog);
routerBlog.post('/:id/comments', blogController.addComment);
routerBlog.put('/:id/comments/:commentId', blogController.updateComment);
routerBlog.delete('/:id/comments/:commentId', blogController.deleteComment);

// Admin Routes
routerBlog.get('/admin/comments/all', blogController.getAllComments);
routerBlog.get('/admin/keywords', blogController.getSensitiveKeywords);
routerBlog.post('/admin/keywords', blogController.addSensitiveKeyword);
routerBlog.delete('/admin/keywords/:id', blogController.deleteSensitiveKeyword);

module.exports = routerBlog;
