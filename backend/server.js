const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'imagination-jee-maths-super-secure-key-2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ==========================================
// Authentication Middleware
// ==========================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired session. Please log in again.' });
        }

        try {
            const user = await db.findUserById(decoded.id);
            if (!user) {
                return res.status(404).json({ error: 'User account no longer exists.' });
            }

            req.user = user;
            next();
        } catch (dbErr) {
            console.error('Session verify error:', dbErr);
            return res.status(500).json({ error: 'Database error verifying session.' });
        }
    });
}

function requireApproved(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.status === 'pending') {
        return res.status(403).json({ 
            error: 'Account approval pending. An administrator must approve your registration first.',
            status: 'pending'
        });
    }

    if (req.user.status === 'rejected') {
        return res.status(403).json({ 
            error: 'Access denied. Your registration has been declined by the administrator.',
            status: 'rejected'
        });
    }

    if (req.user.status !== 'approved') {
        return res.status(403).json({ error: 'Access unauthorized.' });
    }

    next();
}

function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role !== 'admin' || req.user.status !== 'approved') {
        return res.status(403).json({ error: 'Administrator access required.' });
    }

    next();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        platform: 'Imagination JEE Maths',
        mode: db.useMongo ? 'MongoDB Atlas (Cloud Production)' : 'Local JSON Database',
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// Auth Routes
// ==========================================

// Public registration endpoint (Option 3: Disabled to keep outsiders away)
app.post('/api/auth/register', (req, res) => {
    return res.status(403).json({
        error: 'Public registration is disabled. Only pre-enrolled mathematics students can access this platform. Please contact your teacher to obtain your account credentials.'
    });
});

// Login (Students & Teachers)
app.post('/api/auth/login', async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        email = email.trim().toLowerCase();

        const user = await db.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: 'Access restricted. No account found with this email. Only enrolled students can log in. Please contact your mathematics teacher.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect password. Please verify and try again.' });
        }

        // Check account active status
        if (user.status === 'rejected') {
            return res.status(403).json({
                error: 'Your student account has been deactivated. Please contact your mathematics teacher.'
            });
        }

        if (user.status === 'pending') {
            return res.status(403).json({
                error: 'Your account is pending activation by your teacher.'
            });
        }

        // Generate JWT token (60 days validity for seamless continuous access)
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '60d' }
        );

        res.json({
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            error: 'Database connection error: ' + (err.message || 'Internal server error.')
        });
    }
});

// Current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const { password, _id, ...safeUser } = req.user;
    res.json({ user: safeUser });
});

// ==========================================
// Admin Routes (Teachers / Administrators only)
// ==========================================

// Teacher creates a new student account (Option 3: Private batch enrollment)
app.post('/api/admin/students', authenticateToken, requireAdmin, async (req, res) => {
    try {
        let { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Student full name, email, and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        email = email.trim().toLowerCase();

        const student = await db.createUser({
            name,
            email,
            password,
            role: 'student',
            status: 'approved' // Teacher created accounts are pre-approved immediately
        });

        res.status(201).json({
            message: 'Student account created and enrolled successfully.',
            student
        });
    } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to create student account.' });
    }
});

// Teacher resets student password
app.patch('/api/admin/students/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        }

        const updated = await db.resetUserPassword(req.params.id, newPassword);
        if (!updated) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        res.json({ message: 'Student password reset successfully.', student: updated });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset student password.' });
    }
});

// Get all users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({ users });
    } catch (err) {
        console.error('Error getting users:', err);
        res.status(500).json({ error: 'Database error fetching users.' });
    }
});

// Update user status (approve / reject)
app.patch('/api/admin/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be pending, approved, or rejected.' });
        }

        const updated = await db.updateUserStatus(req.params.id, status, req.user.email);
        if (!updated) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ message: `User status updated to ${status}.`, user: updated });
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ error: 'Failed to update user status.' });
    }
});

// Update user role (promote to admin or demote to student)
app.patch('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['student', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be student or admin.' });
        }

        const updated = await db.updateUserRole(req.params.id, role);
        if (!updated) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ message: `User role updated to ${role}.`, user: updated });
    } catch (err) {
        console.error('Error updating role:', err);
        res.status(500).json({ error: 'Failed to update user role.' });
    }
});

// Delete user
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own admin account.' });
        }

        const deleted = await db.deleteUser(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// ==========================================
// Announcements Routes (Class links, notices)
// ==========================================

// Get all announcements (any approved student or admin)
app.get('/api/announcements', authenticateToken, requireApproved, async (req, res) => {
    try {
        const announcements = await db.getAllAnnouncements();
        res.json({ announcements });
    } catch (err) {
        console.error('Error getting announcements:', err);
        res.status(500).json({ error: 'Failed to load announcements.' });
    }
});

// Post announcement (admin only)
app.post('/api/announcements', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, body, link, linkLabel } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Title and message body are required.' });
        }

        const newAnn = await db.createAnnouncement({
            title,
            body,
            link,
            linkLabel,
            postedBy: req.user.name || req.user.email
        });

        res.status(201).json({ message: 'Announcement posted successfully.', announcement: newAnn });
    } catch (err) {
        console.error('Error posting announcement:', err);
        res.status(500).json({ error: 'Failed to post announcement.' });
    }
});

// Delete announcement (admin only)
app.delete('/api/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const deleted = await db.deleteAnnouncement(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Announcement not found.' });
        }

        res.json({ message: 'Announcement deleted successfully.' });
    } catch (err) {
        console.error('Error deleting announcement:', err);
        res.status(500).json({ error: 'Failed to delete announcement.' });
    }
});

// ==========================================
// Lecture Planner Routes (User's personal study plan)
// ==========================================

app.get('/api/lectures', authenticateToken, requireApproved, async (req, res) => {
    try {
        const lectures = await db.getUserLectures(req.user.id);
        res.json({ lectures });
    } catch (err) {
        console.error('Error fetching lectures:', err);
        res.status(500).json({ error: 'Failed to fetch lectures.' });
    }
});

app.post('/api/lectures', authenticateToken, requireApproved, async (req, res) => {
    try {
        const { name, date, time, notes } = req.body;
        if (!name || !date || !time) {
            return res.status(400).json({ error: 'Name, date, and time are required.' });
        }

        const lecture = await db.createLecture(req.user.id, { name, date, time, notes });
        res.status(201).json({ lecture });
    } catch (err) {
        console.error('Error creating lecture:', err);
        res.status(500).json({ error: 'Failed to save lecture.' });
    }
});

app.patch('/api/lectures/:id/toggle', authenticateToken, requireApproved, async (req, res) => {
    try {
        const { completed } = req.body;
        const lecture = await db.toggleLecture(req.user.id, req.params.id, completed);
        if (!lecture) return res.status(404).json({ error: 'Lecture not found.' });
        res.json({ lecture });
    } catch (err) {
        console.error('Error toggling lecture:', err);
        res.status(500).json({ error: 'Failed to update lecture status.' });
    }
});

app.delete('/api/lectures/:id', authenticateToken, requireApproved, async (req, res) => {
    try {
        const deleted = await db.deleteLecture(req.user.id, req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Lecture not found.' });
        res.json({ message: 'Lecture deleted.' });
    } catch (err) {
        console.error('Error deleting lecture:', err);
        res.status(500).json({ error: 'Failed to delete lecture.' });
    }
});

// ==========================================
// JEE Mathematics Practice & Question Bank Routes
// ==========================================

// Get all chapters with question counts (Student & Teacher)
app.get('/api/practice/chapters', authenticateToken, requireApproved, async (req, res) => {
    try {
        const chapters = await db.getChaptersWithCounts();
        res.json({ chapters });
    } catch (err) {
        console.error('Error getting chapters:', err);
        res.status(500).json({ error: 'Failed to load chapters.' });
    }
});

// Get practice questions for a specific chapter (Students - answers stripped for integrity)
app.get('/api/practice/questions', authenticateToken, requireApproved, async (req, res) => {
    try {
        const { chapter } = req.query;
        if (!chapter) {
            return res.status(400).json({ error: 'Chapter identifier is required.' });
        }
        const questions = await db.getQuestionsByChapter(chapter, false);
        res.json({ questions });
    } catch (err) {
        console.error('Error getting practice questions:', err);
        res.status(500).json({ error: 'Failed to load questions.' });
    }
});

// Verify student answer and return immediate feedback + solution
app.post('/api/practice/verify', authenticateToken, requireApproved, async (req, res) => {
    try {
        const { questionId, studentAnswer } = req.body;
        if (!questionId || studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
            return res.status(400).json({ error: 'Question ID and student answer are required.' });
        }

        const result = await db.verifyAnswer(questionId, studentAnswer);
        res.json(result);
    } catch (err) {
        console.error('Error verifying answer:', err);
        res.status(400).json({ error: err.message || 'Failed to verify answer.' });
    }
});

// Teacher: Get all questions with answers for a chapter
app.get('/api/admin/questions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { chapter } = req.query;
        const questions = await db.getQuestionsByChapter(chapter || null, true);
        res.json({ questions });
    } catch (err) {
        console.error('Error getting admin questions:', err);
        res.status(500).json({ error: 'Failed to load question bank.' });
    }
});

// Teacher: Create a new question for any chapter
app.post('/api/admin/questions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { chapterId, type, questionText, options, correctAnswer, explanation, difficulty } = req.body;

        if (!chapterId || !type || !questionText) {
            return res.status(400).json({ error: 'Chapter, question type, and question text are required.' });
        }

        if (type !== 'numerical' && (!options || options.length < 2)) {
            return res.status(400).json({ error: 'MCQ questions require at least 2 options (A, B, C, D).' });
        }

        if (correctAnswer === undefined || correctAnswer === null || correctAnswer === '' || (Array.isArray(correctAnswer) && correctAnswer.length === 0)) {
            return res.status(400).json({ error: 'Correct answer is required.' });
        }

        const question = await db.createQuestion({
            chapterId,
            type,
            questionText,
            options,
            correctAnswer,
            explanation,
            difficulty: difficulty || 'JEE Main',
            createdBy: req.user.name || req.user.email
        });

        res.status(201).json({ message: 'Question added successfully to chapter.', question });
    } catch (err) {
        console.error('Error creating question:', err);
        res.status(400).json({ error: err.message || 'Failed to create question.' });
    }
});

// Teacher: Delete a question
app.delete('/api/admin/questions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const deleted = await db.deleteQuestion(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Question not found.' });
        }
        res.json({ message: 'Question deleted successfully.' });
    } catch (err) {
        console.error('Error deleting question:', err);
        res.status(500).json({ error: 'Failed to delete question.' });
    }
});

// Standalone local execution
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(`🚀 Imagination Server is running!`);
        console.log(`📍 Web URL: http://localhost:${PORT}`);
        console.log(`🔐 Default Admin: admin@imagination.com / Admin@123`);
        console.log(`💾 Database: ${db.useMongo ? 'MongoDB Atlas (Cloud Production)' : 'Local JSON'}`);
        console.log(`======================================================\n`);
    });
}

// Export for Vercel Serverless Function entrypoint
module.exports = app;
