import axios from "../AxiosCustomize";

export const getBlogs = (params = {}) =>
    axios.get(`/api/blogs`, { params });

export const getFeaturedBlog = () =>
    axios.get(`/api/blogs/featured`);

export const getBlogDetail = (id) =>
    axios.get(`/api/blogs/${id}`);

export const getBlogCategories = () =>
    axios.get(`/api/blogs/categories`);

export const createBlog = (blogData) =>
    axios.post(`/api/blogs`, blogData);

export const updateBlog = (id, blogData) =>
    axios.put(`/api/blogs/${id}`, blogData);

export const deleteBlog = (id, reason) =>
    axios.delete(`/api/blogs/${id}`, { data: { reason } });

export const toggleSaveBlog = (id, userName) =>
    axios.post(`/api/blogs/${id}/save`, { userName });

export const manageBlogStatus = (id, status, reason) =>
    axios.patch(`/api/blogs/${id}/status`, { status, reason });

export const toggleFeaturedBlog = (id) =>
    axios.patch(`/api/blogs/${id}/featured`);

export const toggleLikeBlog = (id, userName) =>
    axios.post(`/api/blogs/${id}/like`, { userName });

export const addComment = (id, commentData) =>
    axios.post(`/api/blogs/${id}/comments`, commentData);

export const updateComment = (id, commentId, commentData) =>
    axios.put(`/api/blogs/${id}/comments/${commentId}`, commentData);

export const deleteComment = (id, commentId, userName, role) =>
    axios.delete(`/api/blogs/${id}/comments/${commentId}`, { params: { userName, role } });

// Admin API
export const getAllComments = () => axios.get('/api/blogs/admin/comments/all');
export const getSensitiveKeywords = () => axios.get('/api/blogs/admin/keywords');
export const addSensitiveKeyword = (data) => axios.post('/api/blogs/admin/keywords', data);
export const deleteSensitiveKeyword = (id) => axios.delete(`/api/blogs/admin/keywords/${id}`);
