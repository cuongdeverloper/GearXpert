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
