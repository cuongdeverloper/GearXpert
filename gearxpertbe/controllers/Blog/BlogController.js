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

module.exports = {
    getBlogs,
    getFeaturedBlog,
    getBlogDetail,
    getBlogCategories,
};
