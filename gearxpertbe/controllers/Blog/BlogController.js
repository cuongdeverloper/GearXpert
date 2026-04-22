const Blog = require("../../models/Blog");
const User = require("../../models/User");
const { sendMail } = require("../../configs/sendMail");
const { blogStatusTemplate, commentDeletedTemplate } = require("../../utils/EmailTemplates");
const mongoose = require("mongoose");
const SensitiveKeyword = require("../../models/SensitiveKeyword");
const NotificationConfig = require("../../configs/NotificationConfig");


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
            isAdmin,
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

        if (isAdmin !== "true") {
            filter.$or = [
                { scheduledPublishDate: null },
                { scheduledPublishDate: { $lte: new Date() } }
            ];
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

        // Determine sort order: Prioritize approval time for the main feed
        let sortOption = { approvedAt: -1, createdAt: -1 }; // default: newest approval first
        if (sort === "oldest") sortOption = { approvedAt: 1, createdAt: 1 };
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

// GET /api/blogs/featured — get all featured blogs
const getFeaturedBlog = async (req, res) => {
    try {
        const blogs = await Blog.find({ isFeatured: true, status: "approved" })
            .sort({ approvedAt: 1, createdAt: 1 })
            .lean();

        if (!blogs || blogs.length === 0) {
            return res.status(200).json([]); // Return empty array if none
        }

        return res.status(200).json(blogs);
    } catch (error) {
        console.error("Error fetching featured blogs:", error);
        return res.status(500).json({ message: "Lỗi khi lấy danh sách bài viết nổi bật" });
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
        const isScheduledForFuture = blog.scheduledPublishDate && new Date(blog.scheduledPublishDate) > new Date();
        
        if (blog.status !== "approved" || isScheduledForFuture) {
            const user = req.user; // Assuming req.user is populated by auth middleware
            const isAdmin = user && user.role === "ADMIN";
            const isAuthor = user && user.name === blog.author.name;

            if (!isAdmin && !isAuthor) {
                return res.status(403).json({ message: "Bài viết này hiện chưa được hiển thị công khai" });
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
        let { title, description, content, category, author, readTime, isFeatured, scheduledPublishDate } = req.body;

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
            scheduledPublishDate: scheduledPublishDate ? new Date(scheduledPublishDate) : null,
        });

        await newBlog.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("admin_new_blog_pending", newBlog);
        }

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
        let { title, description, content, category, author, readTime, isFeatured, existingImages, scheduledPublishDate } = req.body;

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
        blog.scheduledPublishDate = scheduledPublishDate ? new Date(scheduledPublishDate) : null;

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
        if (status === "approved" && oldStatus !== "approved") {
            blog.approvedAt = new Date();
        }
        await blog.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("admin_blog_status_changed", { blogId: blog._id, oldStatus, newStatus: status });
        }

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

// POST /api/blogs/:id/like — toggle like status
const toggleLikeBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { userName } = req.body;

        if (!userName) {
            return res.status(400).json({ message: "Vui lòng đăng nhập để like bài viết" });
        }

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        const likeIndex = blog.likes.indexOf(userName);
        if (likeIndex === -1) {
            blog.likes.push(userName);
            
            // Send notification to author
            try {
                 const [senderUser, receiverUser] = await Promise.all([
                    User.findOne({ fullName: userName }),
                    User.findOne({ fullName: blog.author.name })
                ]);

                if (senderUser && receiverUser && senderUser._id.toString() !== receiverUser._id.toString()) {
                    await NotificationConfig.sendNotification({
                        senderId: senderUser._id,
                        receiverId: receiverUser._id,
                        title: "Lượt thích mới",
                        message: `${userName} đã thích bài viết "${blog.title}" của bạn.`,
                        link: `/blog/${blog._id}`,
                        type: "LIKE"
                    });
                }
            } catch (notifyError) {
                console.error("Error sending like notification:", notifyError);
            }
        } else {
            blog.likes.splice(likeIndex, 1);
        }

        await blog.save();

        // Emit realtime update to the blog room
        const io = req.app.get("io");
        if (io) {
            io.to(`blog_${id}`).emit("blogUpdate", { type: "LIKE", blog });
        }

        return res.status(200).json({
            message: likeIndex > -1 ? "Đã bỏ thích bài viết" : "Đã thích bài viết thành công!",
            isLiked: likeIndex === -1,
            blog
        });
    } catch (error) {
        console.error("Error toggling like:", error);
        return res.status(500).json({ message: "Lỗi khi thực hiện thao tác like" });
    }
};

// POST /api/blogs/:id/comments — add a comment
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { userName, avatar, text } = req.body;

        if (!userName || !text) {
            return res.status(400).json({ message: "Thông tin bình luận không đầy đủ" });
        }

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        // Check for sensitive keywords
        const blockedKeywords = await SensitiveKeyword.find().select("keyword");
        const containsSensitive = blockedKeywords.some(bk => 
            text.toLowerCase().includes(bk.keyword.toLowerCase())
        );

        if (containsSensitive) {
            return res.status(400).json({ 
                message: "Bình luận chứa từ ngữ không phù hợp và đã bị chặn tự động." 
            });
        }

        const newComment = {
            user: userName,
            avatar: avatar || "",
            text: text,
            createdAt: new Date(),
        };

        blog.comments.push(newComment);
        await blog.save();

        // Emit realtime update to the blog room
        const io = req.app.get("io");
        if (io) {
            io.to(`blog_${id}`).emit("blogUpdate", { type: "COMMENT_ADD", blog });
        }

        // Send notification to author
        try {
            const [senderUser, receiverUser] = await Promise.all([
                User.findOne({ fullName: userName }),
                User.findOne({ fullName: blog.author.name })
            ]);

            if (senderUser && receiverUser && senderUser._id.toString() !== receiverUser._id.toString()) {
                await NotificationConfig.sendNotification({
                    senderId: senderUser._id,
                    receiverId: receiverUser._id,
                    title: "Bình luận mới",
                    message: `${userName} đã bình luận về bài viết "${blog.title}" của bạn.`,
                    link: `/blog/${blog._id}`,
                    type: "COMMENT"
                });
            }
        } catch (notifyError) {
            console.error("Error sending comment notification:", notifyError);
        }

        return res.status(200).json({
            message: "Đã thêm bình luận thành công!",
            blog
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({ message: "Lỗi khi gửi bình luận" });
    }
};

// PUT /api/blogs/:id/comments/:commentId — edit a comment
const updateComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { userName, text } = req.body;

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ message: "Bài viết không tồn tại" });

        const comment = blog.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Bình luận không tồn tại" });

        if (comment.user !== userName) {
            return res.status(403).json({ message: "Bạn không có quyền sửa bình luận này" });
        }

        // Check for sensitive keywords
        const blockedKeywords = await SensitiveKeyword.find().select("keyword");
        const containsSensitive = blockedKeywords.some(bk => 
            text.toLowerCase().includes(bk.keyword.toLowerCase())
        );

        if (containsSensitive) {
            return res.status(400).json({ 
                message: "Nội dung chỉnh sửa chứa từ ngữ không phù hợp và đã bị chặn." 
            });
        }

        comment.text = text;
        await blog.save();

        // Emit realtime update to the blog room
        const io = req.app.get("io");
        if (io) {
            io.to(`blog_${id}`).emit("blogUpdate", { type: "COMMENT_EDIT", blog });
        }

        return res.status(200).json({ message: "Đã cập nhật bình luận", blog });
    } catch (error) {
        console.error("Error updating comment:", error);
        return res.status(500).json({ message: "Lỗi khi cập nhật bình luận" });
    }
};

// DELETE /api/blogs/:id/comments/:commentId — delete a comment
const deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { userName, role } = req.query; // Get userName and role from query params

        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ message: "Bài viết không tồn tại" });

        const comment = blog.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Bình luận không tồn tại" });

        const isAdmin = role === "ADMIN";
        const isOwner = comment.user === userName;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
        }

        // Send email if deleted by admin (not owner)
        if (isAdmin && !isOwner) {
            // Find user email by username (or email field if that's what's stored)
            // Assuming comment.user stores the unique identifier (email or username)
            const targetUser = await User.findOne({ 
                $or: [{ email: comment.user }, { fullName: comment.user }] 
            });

            if (targetUser && targetUser.email) {
                const subject = "Thông báo: Bình luận của bạn đã bị gỡ bỏ";
                const html = commentDeletedTemplate(
                    targetUser.fullName || comment.user, 
                    blog.title, 
                    comment.text,
                    "Vi phạm tiêu chuẩn cộng đồng hoặc nội dung không phù hợp."
                );
                await sendMail(targetUser.email, subject, html);
            }
        }

        blog.comments.pull(commentId);
        await blog.save();

        // Emit realtime update to the blog room
        const io = req.app.get("io");
        if (io) {
            io.to(`blog_${id}`).emit("blogUpdate", { type: "COMMENT_DELETE", blog });
        }

        return res.status(200).json({ message: "Đã xóa bình luận", blog });
    } catch (error) {
        console.error("Error deleting comment:", error);
        return res.status(500).json({ message: "Lỗi khi xóa bình luận" });
    }
};

// Admin: Get all comments across all blogs
const getAllComments = async (req, res) => {
    try {
        const blogs = await Blog.find({}, 'title comments').lean();
        let allComments = [];
        
        blogs.forEach(blog => {
            const commentsWithBlogInfo = (blog.comments || []).map(c => ({
                ...c,
                blogId: blog._id,
                blogTitle: blog.title
            }));
            allComments = [...allComments, ...commentsWithBlogInfo];
        });

        // Sort by newest first
        allComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.status(200).json(allComments);
    } catch (error) {
        console.error("Error fetching all comments:", error);
        return res.status(500).json({ message: "Lỗi khi lấy danh sách bình luận" });
    }
};

// Admin: Sensitive Keywords Management
const getSensitiveKeywords = async (req, res) => {
    try {
        const keywords = await SensitiveKeyword.find().sort({ createdAt: -1 });
        return res.status(200).json(keywords);
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi lấy danh sách từ nhạy cảm" });
    }
};

const addSensitiveKeyword = async (req, res) => {
    try {
        const { keyword, adminName } = req.body;
        if (!keyword) return res.status(400).json({ message: "Vui lòng nhập từ khóa" });

        const existing = await SensitiveKeyword.findOne({ keyword: keyword.toLowerCase() });
        if (existing) return res.status(400).json({ message: "Từ khóa này đã tồn tại" });

        const newKeyword = new SensitiveKeyword({
            keyword: keyword.toLowerCase(),
            createdBy: adminName || "Admin"
        });
        await newKeyword.save();
        return res.status(201).json(newKeyword);
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi thêm từ khóa" });
    }
};

const deleteSensitiveKeyword = async (req, res) => {
    try {
        const { id } = req.params;
        await SensitiveKeyword.findByIdAndDelete(id);
        return res.status(200).json({ message: "Đã xóa từ khóa thành công" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi xóa từ khóa" });
    }
};

// Admin: Toggle featured blog
const toggleFeaturedBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }

        if (blog.status !== "approved") {
            return res.status(400).json({ message: "Chỉ bài viết đã duyệt mới có thể đặt làm nổi bật" });
        }

        blog.isFeatured = !blog.isFeatured;
        await blog.save();

        return res.status(200).json({
            message: `Đã ${blog.isFeatured ? 'đặt làm' : 'gỡ bỏ'} bài viết nổi bật`,
            blog
        });
    } catch (error) {
        console.error("Error toggling featured status:", error);
        return res.status(500).json({ message: "Lỗi khi thay đổi trạng thái nổi bật" });
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
    toggleLikeBlog,
    addComment,
    updateComment,
    deleteComment,
    getAllComments,
    getSensitiveKeywords,
    addSensitiveKeyword,
    deleteSensitiveKeyword,
    toggleFeaturedBlog,
};
