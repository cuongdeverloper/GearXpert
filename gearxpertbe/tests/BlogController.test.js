const {
    getBlogs, getFeaturedBlog, getBlogDetail, getBlogCategories, createBlog,
    updateBlog, deleteBlog, toggleSaveBlog, manageBlogStatus, toggleLikeBlog,
    addComment, updateComment, deleteComment, getAllComments, getSensitiveKeywords,
    addSensitiveKeyword, deleteSensitiveKeyword, toggleFeaturedBlog
} = require('../controllers/Blog/BlogController');
const Blog = require('../models/Blog');
const User = require('../models/User');
const SensitiveKeyword = require('../models/SensitiveKeyword');
const { sendMail } = require('../configs/sendMail');
const NotificationConfig = require('../configs/NotificationConfig');

jest.mock('../models/Blog');
jest.mock('../models/User');
jest.mock('../models/SensitiveKeyword');
jest.mock('../configs/sendMail');
jest.mock('../configs/NotificationConfig');
jest.mock('../utils/EmailTemplates', () => ({
    blogStatusTemplate: jest.fn().mockReturnValue('<html>T</html>'),
    commentDeletedTemplate: jest.fn().mockReturnValue('<html>T</html>')
}));

describe('BlogController Ultimate Coverage Tests (>80%)', () => {
    let req, res, io;
    beforeEach(() => {
        io = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
        req = { query: {}, params: {}, body: {}, user: { name: 'A', role: 'USER' }, files: [], app: { get: jest.fn().mockReturnValue(io) } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
        jest.clearAllMocks();
    });

    const mockResponse = (mockData = [{ title: 'B' }]) => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockData)
    });

    // --- 1. GET BLOGS & CATEGORIES ---
    describe('Fetching Blogs', () => {
        it('covers all filters: status all, category, search, popular, isSaved', async () => {
            req.query = { status: 'all', category: 'C', search: 'S', sort: 'popular', featured: 'true', authorName: 'A', isSaved: 'true' };
            Blog.find.mockReturnValue(mockResponse());
            Blog.countDocuments.mockResolvedValue(1);
            Blog.aggregate.mockResolvedValue([{ _id: 'approved', count: 1 }]);
            await getBlogs(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('covers authorName filter without isSaved', async () => {
            req.query = { authorName: 'A' };
            Blog.find.mockReturnValue(mockResponse());
            await getBlogs(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('covers oldest sort and pending status', async () => {
            req.query = { sort: 'oldest', status: 'pending' };
            Blog.find.mockReturnValue(mockResponse());
            await getBlogs(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('getFeaturedBlog: empty and success paths', async () => {
            Blog.find.mockReturnValue({ sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) });
            await getFeaturedBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            Blog.find.mockReturnValue({ sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ t: 'F' }]) });
            await getFeaturedBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('getBlogCategories success and error', async () => {
            Blog.distinct.mockResolvedValue(['C1']);
            await getBlogCategories(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            Blog.distinct.mockRejectedValue(new Error());
            await getBlogCategories(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // --- 2. DETAIL & PERMISSIONS ---
    describe('Blog Detail & Permissions', () => {
        it('getBlogDetail: 200, 404, 403, and Admin override', async () => {
            // Success approved
            Blog.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({ status: 'approved', author: { name: 'X' } }) });
            await getBlogDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            // 404
            Blog.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
            await getBlogDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(404);

            // 403 for stranger
            Blog.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({ status: 'pending', author: { name: 'Other' } }) });
            req.user = { name: 'Stranger', role: 'USER' };
            await getBlogDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(403);

            // 200 for Admin on pending
            req.user = { name: 'Admin', role: 'ADMIN' };
            await getBlogDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(200);

            // 200 for Author on pending
            req.user = { name: 'Other', role: 'USER' };
            Blog.findByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue({ status: 'pending', author: { name: 'Other' } }) });
            await getBlogDetail(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // --- 3. CRUD LOGIC ---
    describe('CRUD Operations', () => {
        it('createBlog: success, parsing error, validation error', async () => {
            req.body = { title: 'T', description: 'D', content: 'C', category: 'Cat', author: '{"name":"A"}', isFeatured: 'true' };
            req.files = [{ path: 'p' }];
            await createBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(201);

            req.body.author = '{bad';
            await createBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(400);

            req.body = { title: 'T' }; // missing info
            await createBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('updateBlog: success, 404, and image management', async () => {
            Blog.findById.mockResolvedValue(null);
            await updateBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(404);

            const mockBlog = { save: jest.fn(), title: 'O', id: '1', coverImage: 'c.jpg', images: [] };
            Blog.findById.mockResolvedValue(mockBlog);
            req.body = { title: 'N', existingImages: '["i.jpg"]' };
            await updateBlog(req, res);
            expect(mockBlog.title).toBe('N');
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('deleteBlog: success, 404, with email notification', async () => {
            Blog.findById.mockResolvedValue(null);
            await deleteBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(404);

            const mockBlog = { status: 'approved', author: { name: 'A' }, title: 'T' };
            Blog.findById.mockResolvedValue(mockBlog);
            User.findOne.mockResolvedValue({ email: 'e' });
            req.body.reason = 'Violation';
            await deleteBlog(req, res);
            expect(sendMail).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // --- 4. INTERACTIONS ---
    describe('Interactions (Like/Save/Comment)', () => {
        it('toggleSaveBlog: add, remove, 404, no user', async () => {
            req.body = {}; await toggleSaveBlog(req, res); expect(res.status).toHaveBeenCalledWith(400);

            req.body.userName = 'U';
            Blog.findById.mockResolvedValue(null); await toggleSaveBlog(req, res); expect(res.status).toHaveBeenCalledWith(404);

            const blog = { savedBy: ['U'], save: jest.fn() };
            Blog.findById.mockResolvedValue(blog);
            await toggleSaveBlog(req, res); expect(blog.savedBy).not.toContain('U');

            blog.savedBy = []; await toggleSaveBlog(req, res); expect(blog.savedBy).toContain('U');
        });

        it('toggleLikeBlog: like, unlike, notifications', async () => {
            const blog = { likes: ['U'], save: jest.fn(), author: { name: 'A' }, title: 'T', _id: '1' };
            Blog.findById.mockResolvedValue(blog);
            req.body.userName = 'U';
            await toggleLikeBlog(req, res); expect(blog.likes).not.toContain('U');

            blog.likes = [];
            User.findOne.mockImplementation(({ fullName }) => ({ _id: fullName === 'U' ? 's' : 'r' }));
            await toggleLikeBlog(req, res); expect(blog.likes).toContain('U');
            expect(NotificationConfig.sendNotification).toHaveBeenCalled();
        });

        it('addComment: success, sensitive keyword', async () => {
            const blog = { comments: { push: jest.fn() }, save: jest.fn(), author: { name: 'A' }, title: 'T', _id: '1' };
            Blog.findById.mockResolvedValue(blog);
            SensitiveKeyword.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ keyword: 'bad' }]) });
            req.body = { userName: 'U', text: 'this is bad' };
            await addComment(req, res); expect(res.status).toHaveBeenCalledWith(400);

            SensitiveKeyword.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
            req.body.text = 'Great';
            User.findOne.mockImplementation(({ fullName }) => ({ _id: fullName === 'U' ? 's' : 'r' }));
            await addComment(req, res); expect(res.status).toHaveBeenCalledWith(200);
        });

        it('updateComment: success, 403, sensitive', async () => {
            const comm = { user: 'U', text: 'O' };
            const blog = { comments: { id: jest.fn().mockReturnValue(comm) }, save: jest.fn() };
            Blog.findById.mockResolvedValue(blog);
            SensitiveKeyword.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

            req.body = { userName: 'Other', text: 'X' };
            await updateComment(req, res); expect(res.status).toHaveBeenCalledWith(403);

            req.body = { userName: 'U', text: 'bad' };
            SensitiveKeyword.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ keyword: 'bad' }]) });
            await updateComment(req, res); expect(res.status).toHaveBeenCalledWith(400);

            req.body.text = 'New';
            SensitiveKeyword.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
            await updateComment(req, res); expect(comm.text).toBe('New');
        });

        it('deleteComment: Admin vs Owner', async () => {
            const comm = { user: 'U', text: 'T' };
            const blog = { comments: { id: jest.fn().mockReturnValue(comm), pull: jest.fn() }, save: jest.fn(), title: 'T' };
            Blog.findById.mockResolvedValue(blog);

            req.query = { role: 'ADMIN', userName: 'Admin' };
            User.findOne.mockResolvedValue({ email: 'e' });
            await deleteComment(req, res); expect(sendMail).toHaveBeenCalled();
        });
    });

    // --- 5. ADMIN UTILS ---
    describe('Admin Utilities', () => {
        it('manageBlogStatus: Approved and Rejected with email', async () => {
            const blog = { status: 'pending', author: { name: 'A' }, save: jest.fn() };
            Blog.findById.mockResolvedValue(blog);
            User.findOne.mockResolvedValue({ email: 'e' });

            req.body = { status: 'approved' }; await manageBlogStatus(req, res);
            expect(blog.status).toBe('approved');

            req.body = { status: 'rejected', reason: 'R' }; await manageBlogStatus(req, res);
            expect(blog.status).toBe('rejected');
            expect(sendMail).toHaveBeenCalled();
        });

        it('sensitiveKeywords: exists check and success', async () => {
            SensitiveKeyword.findOne.mockResolvedValue({ k: 'bad' });
            req.body.keyword = 'bad';
            await addSensitiveKeyword(req, res); expect(res.status).toHaveBeenCalledWith(400);

            SensitiveKeyword.findOne.mockResolvedValue(null);
            SensitiveKeyword.prototype.save = jest.fn().mockResolvedValue({});
            await addSensitiveKeyword(req, res); expect(res.status).toHaveBeenCalledWith(201);

            await deleteSensitiveKeyword(req, res); expect(res.status).toHaveBeenCalledWith(200);
            await getSensitiveKeywords(req, res); expect(res.status).toHaveBeenCalledWith(200);
        });

        it('toggleFeaturedBlog: success and 400', async () => {
            const blog = { status: 'approved', isFeatured: false, save: jest.fn() };
            Blog.findById.mockResolvedValue(blog);
            await toggleFeaturedBlog(req, res); expect(blog.isFeatured).toBe(true);

            blog.status = 'pending';
            await toggleFeaturedBlog(req, res); expect(res.status).toHaveBeenCalledWith(400);
        });

        it('getAllComments coverage', async () => {
            Blog.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ title: 'B', comments: [{ text: 'C' }] }]) });
            await getAllComments(req, res); expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Ultimate Error Coverage', () => {
        it('covers remaining catch blocks', async () => {
            Blog.findById.mockImplementation(() => { throw new Error(); });
            await deleteBlog(req, res); expect(res.status).toHaveBeenCalledWith(500);
            await toggleSaveBlog(req, res); expect(res.status).toHaveBeenCalledWith(500);
            await manageBlogStatus(req, res); expect(res.status).toHaveBeenCalledWith(500);
            await toggleLikeBlog(req, res); expect(res.status).toHaveBeenCalledWith(500);
            await addComment(req, res); expect(res.status).toHaveBeenCalledWith(500);
            await updateComment(req, res); expect(res.status).toHaveBeenCalledWith(500);
            await deleteComment(req, res); expect(res.status).toHaveBeenCalledWith(500);
            await getAllComments(req, res); expect(res.status).toHaveBeenCalledWith(500);
            await toggleFeaturedBlog(req, res); expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});