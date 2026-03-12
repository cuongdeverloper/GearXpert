const Blog = require("../../models/Blog");
const User = require("../../models/User");
const { sendMail } = require("../../configs/sendMail");
const { blogStatusTemplate } = require("../../utils/EmailTemplates");
const mongoose = require("mongoose");

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
            authorName,
            status,
        } = req.query;

        const filter = {};

        // By default, only show approved blogs if no status is specified
        if (status && status.toLowerCase() !== "all") {
            filter.status = status;
        } else if (status && status.toLowerCase() === "all") {
            // No status filter for "all"
        } else {
            filter.status = "approved";
        }

        if (category) {
            filter.category = category;
        }

        if (featured === "true") {
            filter.isFeatured = true;
            filter.status = "approved"; // Featured must be approved
        }

        if (authorName && req.query.isSaved === "true") {
            filter.savedBy = authorName; // Filter blogs saved by this user
        } else if (authorName) {
            filter["author.name"] = authorName;
        }

        if (search) {
            const searchRegex = new RegExp(search, "i");
            filter.$or = [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                { category: { $regex: searchRegex } },
            ];
        }

        // Determine sort order
        let sortOption = { createdAt: -1 }; // default: newest
        if (sort === "oldest") sortOption = { createdAt: 1 };
        if (sort === "popular") sortOption = { views: -1 };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [blogs, total, counts] = await Promise.all([
            Blog.find(filter)
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Blog.countDocuments(filter),
            Blog.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const stats = {
            all: 0,
            pending: 0,
            approved: 0,
            rejected: 0
        };

        counts.forEach(item => {
            if (item._id) {
                stats[item._id] = item.count;
            }
            stats.all += item.count;
        });

        return res.status(200).json({
            blogs,
            total,
            stats,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        return res.status(500).json({ message: "Lỗi khi lấy danh sách bài viết" });
    }
};

// GET /api/blogs/featured — get featured blog
const getFeaturedBlog = async (req, res) => {
    try {
        const blog = await Blog.findOne({ isFeatured: true, status: "approved" })
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
        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        ).lean();

        if (!blog) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        // Security check: Only approved blogs are public
        // If pending/rejected, only admin or author can view
        if (blog.status !== "approved") {
            const user = req.user; // Assuming req.user is populated by auth middleware
            const isAdmin = user && user.role === "ADMIN";
            const isAuthor = user && user.name === blog.author.name;

            if (!isAdmin && !isAuthor) {
                return res.status(403).json({ message: "Bài viết này đang chờ duyệt hoặc đã bị từ chối" });
            }
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
        let { title, description, content, category, author, readTime, isFeatured } = req.body;

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
            images: images,
            status: "pending", // Always pending on create
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

// PUT /api/blogs/:id — update an existing blog
const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        let { title, description, content, category, author, readTime, isFeatured, existingImages } = req.body;

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        // Xử lý images mới từ Cloudinary (req.files)
        let newImages = [];
        if (req.files && req.files.length > 0) {
            newImages = req.files.map(file => file.path);
        }

        // Parse existingImages if it's a string
        let keptImages = [];
        if (existingImages) {
            try {
                keptImages = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
            } catch (e) {
                keptImages = Array.isArray(existingImages) ? existingImages : [existingImages];
            }
        }

        const finalImages = [...keptImages, ...newImages];
        const coverImage = finalImages.length > 0 ? finalImages[0] : blog.coverImage;

        // Update fields
        blog.title = title || blog.title;
        blog.description = description || blog.description;
        blog.content = content || blog.content;
        blog.category = category || blog.category;
        blog.coverImage = coverImage;
        blog.images = finalImages;
        blog.readTime = parseInt(readTime) || blog.readTime;
        blog.isFeatured = isFeatured !== undefined ? (isFeatured === 'true' || isFeatured === true) : blog.isFeatured;

        await blog.save();

        return res.status(200).json({
            message: "Cập nhật bài viết thành công!",
            blog,
        });
    } catch (error) {
        console.error("Error updating blog:", error);
        return res.status(500).json({ message: "Lỗi khi cập nhật bài viết" });
    }
};

// DELETE /api/blogs/:id — delete a blog
const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        // Send notification email before deleting
        // Only send if a reason is provided AND the blog was not already rejected
        if (reason && blog.status !== "rejected") {
            const authorUser = await User.findOne({ fullName: blog.author.name });
            if (authorUser && authorUser.email) {
                const subject = "Thông báo: Bài viết của bạn đã bị gỡ";
                const html = blogStatusTemplate(blog.author.name, blog.title, "deleted", reason);
                await sendMail(authorUser.email, subject, html);
            }
        }

        await Blog.findByIdAndDelete(id);

        return res.status(200).json({ message: "Xóa bài viết thành công!" });
    } catch (error) {
        console.error("Error deleting blog:", error);
        return res.status(500).json({ message: "Lỗi khi xóa bài viết" });
    }
};

// POST /api/blogs/:id/save — toggle save status
const toggleSaveBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { userName } = req.body;

        if (!userName) {
            return res.status(400).json({ message: "Vui lòng đăng nhập để lưu bài viết" });
        }

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        const isSaved = blog.savedBy.includes(userName);
        if (isSaved) {
            blog.savedBy = blog.savedBy.filter(name => name !== userName);
        } else {
            blog.savedBy.push(userName);
        }

        await blog.save();

        return res.status(200).json({
            message: isSaved ? "Đã bỏ lưu bài viết" : "Đã lưu bài viết thành công!",
            isSaved: !isSaved,
            blog
        });
    } catch (error) {
        console.error("Error toggling save:", error);
        return res.status(500).json({ message: "Lỗi khi lưu bài viết" });
    }
};

// PATCH /api/blogs/:id/status — manage blog status (admin only)
const manageBlogStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        if (!["pending", "approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        const oldStatus = blog.status;
        blog.status = status;
        await blog.save();

        // Send email notification for rejection
        if (status === "rejected" && reason) {
            const authorUser = await User.findOne({ fullName: blog.author.name });
            if (authorUser && authorUser.email) {
                const subject = "Thông báo: Trạng thái bài viết trên GearXpert";
                const html = blogStatusTemplate(blog.author.name, blog.title, "rejected", reason);
                await sendMail(authorUser.email, subject, html);
            }
        } else if (status === "approved" && oldStatus !== "approved") {
             const authorUser = await User.findOne({ fullName: blog.author.name });
             if (authorUser && authorUser.email) {
                 const subject = "Chúc mừng! Bài viết của bạn đã được xuất bản";
                 const html = blogStatusTemplate(blog.author.name, blog.title, "approved");
                 await sendMail(authorUser.email, subject, html);
             }
        }

        return res.status(200).json({
            message: `Bài viết đã được chuyển sang trạng thái: ${status}`,
            blog
        });
    } catch (error) {
        console.error("Error managing status:", error);
        return res.status(500).json({ message: "Lỗi khi cập nhật trạng thái bài viết" });
    }
};

module.exports = {
    getBlogs,
    getFeaturedBlog,
    getBlogDetail,
    getBlogCategories,
    createBlog,
    updateBlog,
    deleteBlog,
    toggleSaveBlog,
    manageBlogStatus,
};
