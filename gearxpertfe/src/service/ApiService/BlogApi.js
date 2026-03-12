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
