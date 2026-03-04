const Blog = require("../../models/Blog");

// GET /api/blogs — list all blogs with pagination, filters, search
const getBlogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            search,
            sort = "newest",
            featured,
        } = req.query;

        const filter = {};

        if (category) {
            filter.category = category;
        }

        if (featured === "true") {
            filter.isFeatured = true;
        }

        if (search) {
            filter.$text = { $search: search };
        }

        // Determine sort order
        let sortOption = { createdAt: -1 }; // default: newest
        if (sort === "oldest") sortOption = { createdAt: 1 };
        if (sort === "popular") sortOption = { readTime: -1 };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [blogs, total] = await Promise.all([
            Blog.find(filter)
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Blog.countDocuments(filter),
        ]);

        return res.status(200).json({
            blogs,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        return res.status(500).json({ message: "Lỗi khi lấy danh sách bài viết" });
    }
};

// GET /api/blogs/featured — get featured blog
const getFeaturedBlog = async (req, res) => {
    try {
        const blog = await Blog.findOne({ isFeatured: true })
            .sort({ createdAt: -1 })
            .lean();

        if (!blog) {
            return res.status(404).json({ message: "Không tìm thấy bài viết nổi bật" });
        }

        return res.status(200).json(blog);
    } catch (error) {
        console.error("Error fetching featured blog:", error);
        return res.status(500).json({ message: "Lỗi khi lấy bài viết nổi bật" });
    }
};

// GET /api/blogs/:id — get single blog by id
const getBlogDetail = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).lean();

        if (!blog) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        return res.status(200).json(blog);
    } catch (error) {
        console.error("Error fetching blog detail:", error);
        return res.status(500).json({ message: "Lỗi khi lấy chi tiết bài viết" });
    }
};

// GET /api/blogs/categories — get all unique categories
const getBlogCategories = async (req, res) => {
    try {
        const categories = await Blog.distinct("category");
        return res.status(200).json(categories);
    } catch (error) {
        console.error("Error fetching blog categories:", error);
        return res.status(500).json({ message: "Lỗi khi lấy danh mục" });
    }
};

// POST /api/blogs — create a new blog
const createBlog = async (req, res) => {
    try {
        let { title, description, content, category, author, readTime, isFeatured, tags } = req.body;

        // Xử lý images từ Cloudinary (req.files)
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => file.path);
        }

        const coverImage = images.length > 0 ? images[0] : null;

        // Parse author if it's a string (FormData case)
        if (typeof author === 'string') {
            try {
                author = JSON.parse(author);
            } catch (e) {
                return res.status(400).json({ message: "Định dạng author không hợp lệ" });
            }
        }

        // Parse tags if it's a string (FormData case)
        if (typeof tags === 'string') {
            try {
                tags = JSON.parse(tags);
            } catch (e) {
                tags = tags.split(',').map(tag => tag.trim());
            }
        }

        // Validations
        if (!title || !description || !content || !category || !coverImage || !author?.name) {
            return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc hoặc chưa tải ảnh lên" });
        }

        const newBlog = new Blog({
            title,
            description,
            content,
            category,
            coverImage,
            author,
            readTime: parseInt(readTime) || 0,
            isFeatured: isFeatured === 'true' || isFeatured === true,
            tags: Array.isArray(tags) ? tags : [],
            images: images,
        });

        await newBlog.save();


        return res.status(201).json({
            message: "Bài viết của bạn đã được gửi thành công!",
            blog: newBlog,
        });
    } catch (error) {
        console.error("Error creating blog:", error);
        return res.status(500).json({ message: "Lỗi khi tạo bài viết" });
    }
};

module.exports = {
    getBlogs,
    getFeaturedBlog,
    getBlogDetail,
    getBlogCategories,
    createBlog,
};
