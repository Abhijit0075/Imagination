const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

let MongoClient = null;
try {
    MongoClient = require('mongodb').MongoClient;
} catch (_) {}

const DATA_DIR = path.join(__dirname, '..', '_do_not_push', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Standard JEE Mathematics Chapters
const JEE_CHAPTERS = [
    { id: "limits-continuity", name: "Limits, Continuity & Differentiability", category: "Calculus" },
    { id: "differentiation-aod", name: "Application of Derivatives (AOD)", category: "Calculus" },
    { id: "integrals", name: "Definite & Indefinite Integrals", category: "Calculus" },
    { id: "differential-equations", name: "Differential Equations", category: "Calculus" },
    { id: "quadratic-equations", name: "Quadratic Equations", category: "Algebra" },
    { id: "complex-numbers", name: "Complex Numbers", category: "Algebra" },
    { id: "sequences-series", name: "Sequences & Series (AP, GP, HP)", category: "Algebra" },
    { id: "matrices-determinants", name: "Matrices & Determinants", category: "Algebra" },
    { id: "permutations-combinations", name: "Permutations & Combinations", category: "Algebra" },
    { id: "binomial-theorem", name: "Binomial Theorem", category: "Algebra" },
    { id: "straight-lines", name: "Straight Lines", category: "Coordinate Geometry" },
    { id: "circles", name: "Circles", category: "Coordinate Geometry" },
    { id: "conic-sections", name: "Conic Sections (Parabola, Ellipse, Hyperbola)", category: "Coordinate Geometry" },
    { id: "vectors-3d", name: "Vectors & 3D Geometry", category: "Vectors & 3D" },
    { id: "trigonometry", name: "Trigonometric Ratios & Equations", category: "Trigonometry" },
    { id: "probability-statistics", name: "Probability & Statistics", category: "Probability" }
];

// Starter JEE Mathematics Practice Questions
const STARTER_QUESTIONS = [
    {
        id: "q-calc-01",
        chapterId: "limits-continuity",
        chapterName: "Limits, Continuity & Differentiability",
        type: "single",
        questionText: "Evaluate the limit: lim (x → 0) [ (sin(3x) · ln(1 + 2x)) / x² ]",
        options: [
            { id: "A", text: "3" },
            { id: "B", text: "6" },
            { id: "C", text: "5" },
            { id: "D", text: "0" }
        ],
        correctAnswer: "B",
        explanation: "By standard limit formulas:\nlim (x→0) [sin(3x) / 3x] = 1 and lim (x→0) [ln(1 + 2x) / 2x] = 1.\nRewriting the expression:\nlim [ (sin 3x / x) · (ln(1 + 2x) / x) ] = [3 · (sin 3x / 3x)] · [2 · (ln(1 + 2x) / 2x)] = 3 · 2 = 6.\nTherefore, Option B is correct.",
        difficulty: "JEE Main",
        createdAt: new Date().toISOString()
    },
    {
        id: "q-alg-01",
        chapterId: "quadratic-equations",
        chapterName: "Quadratic Equations",
        type: "multiple",
        questionText: "If α and β are the roots of the equation x² - 6x + 2 = 0 with α > β, and aₙ = αⁿ - βⁿ for all n ≥ 1, which of the following statements are TRUE?",
        options: [
            { id: "A", text: "(a₁₀ - 2·a₈) / (2·a₉) = 3" },
            { id: "B", text: "a₁₀ = 6·a₉ - 2·a₈" },
            { id: "C", text: "Product of roots α · β = 2" },
            { id: "D", text: "Sum of roots α + β = -6" }
        ],
        correctAnswer: ["A", "B", "C"],
        explanation: "Since α and β satisfy x² - 6x + 2 = 0, we have αⁿ⁺² - 6αⁿ⁺¹ + 2αⁿ = 0.\nSubtracting the equations gives Newton's identity:\naₙ - 6aₙ₋₁ + 2aₙ₋₂ = 0.\nFor n = 10: a₁₀ - 6a₉ + 2a₈ = 0 => a₁₀ = 6a₉ - 2a₈ (Statement B is TRUE).\nRearranging: a₁₀ - 2a₈ = 6a₉ => (a₁₀ - 2a₈) / (2a₉) = 3 (Statement A is TRUE).\nAlso, product αβ = 2 (Statement C is TRUE) and sum α+β = 6 (Statement D is FALSE).\nHence, options A, B, and C are correct.",
        difficulty: "JEE Advanced",
        createdAt: new Date().toISOString()
    },
    {
        id: "q-int-01",
        chapterId: "integrals",
        chapterName: "Definite & Indefinite Integrals",
        type: "numerical",
        questionText: "Let I = ∫₀^(π/2) [ sin³(x) / (sin³(x) + cos³(x)) ] dx. Find the exact numerical value of (4 · I) / π.",
        options: [],
        correctAnswer: "1",
        explanation: "Using King's property: ∫₀ᵃ f(x)dx = ∫₀ᵃ f(a-x)dx:\nI = ∫₀^(π/2) [ cos³(x) / (cos³(x) + sin³(x)) ] dx.\nAdding both expressions:\n2I = ∫₀^(π/2) [ (sin³x + cos³x) / (sin³x + cos³x) ] dx = ∫₀^(π/2) 1 dx = π/2.\nSo I = π/4.\nTherefore, (4 · I) / π = (4 · (π/4)) / π = 1.",
        difficulty: "JEE Main",
        createdAt: new Date().toISOString()
    },
    {
        id: "q-geom-01",
        chapterId: "circles",
        chapterName: "Circles",
        type: "numerical",
        questionText: "Find the radius of the circle given by the equation: x² + y² - 6x + 8y - 11 = 0.",
        options: [],
        correctAnswer: "6",
        explanation: "Comparing with the standard equation x² + y² + 2gx + 2fy + c = 0:\n2g = -6 => g = -3\n2f = 8 => f = 4\nc = -11\nRadius r = √(g² + f² - c) = √((-3)² + 4² - (-11)) = √(9 + 16 + 11) = √36 = 6.",
        difficulty: "JEE Main",
        createdAt: new Date().toISOString()
    }
];

// Serverless MongoDB cached connection
let cachedClient = null;
let cachedDb = null;

class Database {
    constructor() {
        this.useMongo = Boolean(process.env.MONGODB_URI && MongoClient);
        this.localData = {
            users: [],
            announcements: [],
            lectures: [],
            questions: [],
            subscriptionRequests: []
        };

        if (!this.useMongo) {
            this.initLocal();
        }
    }

    // ========================================================
    // Local JSON File Engine (Development / Offline Fallback)
    // ========================================================
    initLocal() {
        if (!fs.existsSync(DATA_DIR)) {
            try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
        }
        this.loadLocal();
        this.seedInitialAdminLocal();
    }

    loadLocal() {
        try {
            if (fs.existsSync(DB_FILE)) {
                const raw = fs.readFileSync(DB_FILE, 'utf-8');
                this.localData = JSON.parse(raw);
                if (!this.localData.users) this.localData.users = [];
                if (!this.localData.announcements) this.localData.announcements = [];
                if (!this.localData.lectures) this.localData.lectures = [];
                if (!this.localData.questions || this.localData.questions.length === 0) {
                    this.localData.questions = [...STARTER_QUESTIONS];
                    this.saveLocal();
                }
            } else {
                this.localData.questions = [...STARTER_QUESTIONS];
                this.saveLocal();
            }
        } catch (err) {
            console.error('[DB] Error loading local database:', err);
            this.localData.questions = [...STARTER_QUESTIONS];
            this.saveLocal();
        }
    }

    saveLocal() {
        try {
            const tempFile = `${DB_FILE}.tmp`;
            fs.writeFileSync(tempFile, JSON.stringify(this.localData, null, 2), 'utf-8');
            fs.renameSync(tempFile, DB_FILE);
        } catch (err) {
            console.error('[DB] Error saving local database:', err);
        }
    }

    seedInitialAdminLocal() {
        const hasAdmin = this.localData.users.some(u => u.role === 'admin');
        if (!hasAdmin) {
            const adminEmail = (process.env.ADMIN_EMAIL || 'admin@imagination.com').toLowerCase();
            const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123';
            const hashed = bcrypt.hashSync(adminPass, 10);
            this.localData.users.push({
                id: crypto.randomUUID(),
                name: 'Teacher / Admin',
                email: adminEmail,
                password: hashed,
                role: 'admin',
                status: 'approved',
                createdAt: new Date().toISOString()
            });
            this.saveLocal();
            console.log(`[DB-Local] Seeded default admin account: ${adminEmail}`);
        }
    }

    // ========================================================
    // MongoDB Cloud Engine (Vercel Serverless Production)
    // Scalable for 200+ concurrent students
    // ========================================================
    async getMongo() {
        if (cachedDb) {
            return cachedDb;
        }

        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI environment variable is missing.');

        if (!cachedClient) {
            cachedClient = new MongoClient(uri, {
                maxPoolSize: 50, // Connection pooling for 200+ concurrent requests
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000
            });
            await cachedClient.connect();
            console.log('[DB-Mongo] Connected to MongoDB Atlas cluster successfully.');
        }

        cachedDb = cachedClient.db('imagination');

        // Ensure indexes
        try {
            await cachedDb.collection('users').createIndex({ email: 1 }, { unique: true });
            await cachedDb.collection('announcements').createIndex({ createdAt: -1 });
            await cachedDb.collection('lectures').createIndex({ userId: 1 });
            await cachedDb.collection('questions').createIndex({ chapterId: 1 });
        } catch (_) {}

        // Seed initial admin and starter questions in MongoDB if not exists
        await this.seedInitialAdminMongo(cachedDb);
        await this.seedStarterQuestionsMongo(cachedDb);

        return cachedDb;
    }

    async seedStarterQuestionsMongo(db) {
        try {
            const count = await db.collection('questions').countDocuments();
            if (count === 0) {
                await db.collection('questions').insertMany(STARTER_QUESTIONS);
                console.log('[DB-Mongo] Seeded starter JEE questions.');
            }
        } catch (err) {
            console.error('[DB-Mongo] Error seeding questions:', err);
        }
    }

    async seedInitialAdminMongo(db) {
        try {
            const adminCount = await db.collection('users').countDocuments({ role: 'admin' });
            if (adminCount === 0) {
                const adminEmail = (process.env.ADMIN_EMAIL || 'admin@imagination.com').toLowerCase();
                const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123';
                const hashed = await bcrypt.hash(adminPass, 10);
                await db.collection('users').insertOne({
                    id: crypto.randomUUID(),
                    name: 'Teacher / Admin',
                    email: adminEmail,
                    password: hashed,
                    role: 'admin',
                    status: 'approved',
                    createdAt: new Date().toISOString()
                });
                console.log(`[DB-Mongo] Seeded initial admin account: ${adminEmail}`);
            }
        } catch (err) {
            console.error('[DB-Mongo] Error seeding admin in MongoDB:', err);
        }
    }

    // ========================================================
    // Unified API (transparently handles MongoDB or Local)
    // ========================================================

    async findUserByEmail(email) {
        if (!email) return null;
        const normalized = email.trim().toLowerCase();

        if (this.useMongo) {
            const db = await this.getMongo();
            return await db.collection('users').findOne({ email: normalized });
        }

        return this.localData.users.find(u => u.email === normalized) || null;
    }

    async findUserById(id) {
        if (!id) return null;

        if (this.useMongo) {
            const db = await this.getMongo();
            return await db.collection('users').findOne({ id });
        }

        return this.localData.users.find(u => u.id === id) || null;
    }

    async getAllUsers() {
        if (this.useMongo) {
            const db = await this.getMongo();
            const docs = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
            return docs.map(({ _id, password, ...safeUser }) => safeUser);
        }

        return this.localData.users.map(({ password, ...safeUser }) => safeUser);
    }

    async createUser({ name, email, password, role = 'student', status = 'approved', subscription = null }) {
        const normalized = email.trim().toLowerCase();
        const existing = await this.findUserByEmail(normalized);
        if (existing) {
            throw new Error('An account with this email already exists.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: crypto.randomUUID(),
            name: name.trim(),
            email: normalized,
            password: hashedPassword,
            role: role,
            status: status,
            subscription: subscription || {
                plan: role === 'admin' ? 'pro' : 'free',
                planName: role === 'admin' ? 'Teacher All-Access' : 'Starter Foundation',
                status: 'active',
                activatedAt: new Date().toISOString()
            },
            createdAt: new Date().toISOString()
        };

        if (this.useMongo) {
            const db = await this.getMongo();
            await db.collection('users').insertOne({ ...newUser });
        } else {
            this.localData.users.push(newUser);
            this.saveLocal();
        }

        const { password: _, ...safeUser } = newUser;
        return safeUser;
    }

    async resetUserPassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateFields = { password: hashedPassword, updatedAt: new Date().toISOString() };

        if (this.useMongo) {
            const db = await this.getMongo();
            const res = await db.collection('users').findOneAndUpdate(
                { id },
                { $set: updateFields },
                { returnDocument: 'after' }
            );
            if (!res) return null;
            const { _id, password, ...safeUser } = res;
            return safeUser;
        }

        const user = this.localData.users.find(u => u.id === id);
        if (!user) return null;
        user.password = hashedPassword;
        user.updatedAt = new Date().toISOString();
        this.saveLocal();
        const { password: _, ...safeUser } = user;
        return safeUser;
    }

    async updateUserStatus(id, newStatus, approvedBy = null) {
        const updateFields = { status: newStatus };
        if (newStatus === 'approved') {
            updateFields.approvedAt = new Date().toISOString();
            if (approvedBy) updateFields.approvedBy = approvedBy;
        }

        if (this.useMongo) {
            const db = await this.getMongo();
            const res = await db.collection('users').findOneAndUpdate(
                { id },
                { $set: updateFields },
                { returnDocument: 'after' }
            );
            if (!res) return null;
            const { _id, password, ...safeUser } = res;
            return safeUser;
        }

        const user = this.localData.users.find(u => u.id === id);
        if (!user) return null;
        Object.assign(user, updateFields);
        this.saveLocal();
        const { password: _, ...safeUser } = user;
        return safeUser;
    }

    async updateUserRole(id, newRole) {
        const updateFields = { role: newRole };
        if (newRole === 'admin') {
            updateFields.status = 'approved';
        }

        if (this.useMongo) {
            const db = await this.getMongo();
            const res = await db.collection('users').findOneAndUpdate(
                { id },
                { $set: updateFields },
                { returnDocument: 'after' }
            );
            if (!res) return null;
            const { _id, password, ...safeUser } = res;
            return safeUser;
        }

        const user = this.localData.users.find(u => u.id === id);
        if (!user) return null;
        Object.assign(user, updateFields);
        this.saveLocal();
        const { password: _, ...safeUser } = user;
        return safeUser;
    }

    async deleteUser(id) {
        if (this.useMongo) {
            const db = await this.getMongo();
            const res = await db.collection('users').deleteOne({ id });
            return res.deletedCount > 0;
        }

        const idx = this.localData.users.findIndex(u => u.id === id);
        if (idx === -1) return false;
        this.localData.users.splice(idx, 1);
        this.saveLocal();
        return true;
    }

    // ========================================================
    // Announcements Operations (Class links & Notices)
    // ========================================================

    async getAllAnnouncements() {
        if (this.useMongo) {
            const db = await this.getMongo();
            const docs = await db.collection('announcements').find({}).sort({ createdAt: -1 }).toArray();
            return docs.map(({ _id, ...safe }) => safe);
        }

        return [...this.localData.announcements].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    async createAnnouncement({ title, body, link, linkLabel, postedBy }) {
        const newAnn = {
            id: crypto.randomUUID(),
            title: title.trim(),
            body: body.trim(),
            link: link ? link.trim() : null,
            linkLabel: linkLabel ? linkLabel.trim() : null,
            postedBy: postedBy || 'Teacher / Admin',
            createdAt: new Date().toISOString()
        };

        if (this.useMongo) {
            const db = await this.getMongo();
            await db.collection('announcements').insertOne({ ...newAnn });
        } else {
            this.localData.announcements.push(newAnn);
            this.saveLocal();
        }

        return newAnn;
    }

    async deleteAnnouncement(id) {
        if (this.useMongo) {
            const db = await this.getMongo();
            const res = await db.collection('announcements').deleteOne({ id });
            return res.deletedCount > 0;
        }

        const idx = this.localData.announcements.findIndex(a => a.id === id);
        if (idx === -1) return false;
        this.localData.announcements.splice(idx, 1);
        this.saveLocal();
        return true;
    }

    // ========================================================
    // Lecture Planner Operations
    // ========================================================

    async getUserLectures(userId) {
        if (this.useMongo) {
            const db = await this.getMongo();
            const docs = await db.collection('lectures').find({ userId }).sort({ date: 1, time: 1 }).toArray();
            return docs.map(({ _id, ...safe }) => safe);
        }

        return this.localData.lectures.filter(l => l.userId === userId);
    }

    async createLecture(userId, { name, date, time, notes }) {
        const newLecture = {
            id: crypto.randomUUID(),
            userId,
            name: name.trim(),
            date,
            time,
            notes: notes ? notes.trim() : '',
            completed: false,
            createdAt: new Date().toISOString()
        };

        if (this.useMongo) {
            const db = await this.getMongo();
            await db.collection('lectures').insertOne({ ...newLecture });
        } else {
            this.localData.lectures.push(newLecture);
            this.saveLocal();
        }

        return newLecture;
    }

    async toggleLecture(userId, id, completed) {
        const isComp = Boolean(completed);

        if (this.useMongo) {
            const db = await this.getMongo();
            const res = await db.collection('lectures').findOneAndUpdate(
                { id, userId },
                { $set: { completed: isComp } },
                { returnDocument: 'after' }
            );
            if (!res) return null;
            const { _id, ...safe } = res;
            return safe;
        }

        const lecture = this.localData.lectures.find(l => l.id === id && l.userId === userId);
        if (!lecture) return null;
        lecture.completed = isComp;
        this.saveLocal();
        return lecture;
    }

    async deleteLecture(userId, id) {
        if (this.useMongo) {
            const db = await this.getMongo();
            const res = await db.collection('lectures').deleteOne({ id, userId });
            return res.deletedCount > 0;
        }

        const idx = this.localData.lectures.findIndex(l => l.id === id && l.userId === userId);
        if (idx === -1) return false;
        this.localData.lectures.splice(idx, 1);
        this.saveLocal();
        return true;
    }
    // ========================================================
    // JEE Mathematics Question Bank & Practice Engine
    // ========================================================

    async getChaptersWithCounts() {
        let allQuestions = [];
        if (this.useMongo) {
            const db = await this.getMongo();
            allQuestions = await db.collection('questions').find({}, { projection: { chapterId: 1 } }).toArray();
        } else {
            allQuestions = this.localData.questions || [];
        }

        const counts = {};
        for (const q of allQuestions) {
            counts[q.chapterId] = (counts[q.chapterId] || 0) + 1;
        }

        return JEE_CHAPTERS.map(ch => ({
            ...ch,
            questionCount: counts[ch.id] || 0
        }));
    }

    async getQuestionsByChapter(chapterId, includeAnswers = false) {
        let questions = [];

        if (this.useMongo) {
            const db = await this.getMongo();
            const filter = chapterId ? { chapterId } : {};
            questions = await db.collection('questions').find(filter).sort({ createdAt: -1 }).toArray();
        } else {
            const all = this.localData.questions || [];
            questions = chapterId ? all.filter(q => q.chapterId === chapterId) : [...all];
        }

        if (includeAnswers) {
            return questions.map(({ _id, ...q }) => q);
        }

        // For students: strip the answer and explanation so they cannot inspect it!
        return questions.map(q => ({
            id: q.id,
            chapterId: q.chapterId,
            chapterName: q.chapterName,
            type: q.type, // 'single', 'multiple', 'numerical'
            questionText: q.questionText,
            options: q.options || [],
            difficulty: q.difficulty || 'JEE Main'
        }));
    }

    async findQuestionById(id) {
        if (!id) return null;

        if (this.useMongo) {
            const db = await this.getMongo();
            return await db.collection('questions').findOne({ id });
        }

        const all = this.localData.questions || [];
        return all.find(q => q.id === id) || null;
    }

    async createQuestion({ chapterId, type, questionText, options = [], correctAnswer, explanation = '', difficulty = 'JEE Main', createdBy = 'Teacher' }) {
        const chapter = JEE_CHAPTERS.find(c => c.id === chapterId);
        const chapterName = chapter ? chapter.name : chapterId;

        const newQuestion = {
            id: crypto.randomUUID(),
            chapterId,
            chapterName,
            type, // 'single', 'multiple', 'numerical'
            questionText: questionText.trim(),
            options: options || [],
            correctAnswer,
            explanation: explanation ? explanation.trim() : '',
            difficulty,
            createdBy,
            createdAt: new Date().toISOString()
        };

        if (this.useMongo) {
            const db = await this.getMongo();
            await db.collection('questions').insertOne({ ...newQuestion });
        } else {
            if (!this.localData.questions) this.localData.questions = [];
            this.localData.questions.push(newQuestion);
            this.saveLocal();
        }

        return newQuestion;
    }

    async deleteQuestion(id) {
        if (this.useMongo) {
            const db = await this.getMongo();
            const res = await db.collection('questions').deleteOne({ id });
            return res.deletedCount > 0;
        }

        if (!this.localData.questions) return false;
        const idx = this.localData.questions.findIndex(q => q.id === id);
        if (idx === -1) return false;
        this.localData.questions.splice(idx, 1);
        this.saveLocal();
        return true;
    }

    async verifyAnswer(questionId, studentAnswer) {
        const q = await this.findQuestionById(questionId);
        if (!q) throw new Error("Question not found.");

        let isCorrect = false;

        if (q.type === 'single') {
            const stu = String(studentAnswer || '').trim().toUpperCase();
            const cor = String(q.correctAnswer || '').trim().toUpperCase();
            isCorrect = stu === cor;
        } else if (q.type === 'multiple') {
            let stuArr = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
            stuArr = stuArr.map(s => String(s).trim().toUpperCase()).sort();

            let corArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
            corArr = corArr.map(c => String(c).trim().toUpperCase()).sort();

            isCorrect = stuArr.length === corArr.length && stuArr.every((val, index) => val === corArr[index]);
        } else if (q.type === 'numerical') {
            const stuNum = parseFloat(studentAnswer);
            const corNum = parseFloat(q.correctAnswer);
            if (!isNaN(stuNum) && !isNaN(corNum)) {
                isCorrect = Math.abs(stuNum - corNum) < 0.01;
            }
        }

        return {
            isCorrect,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "No explanation provided for this question."
        };
    }
}

module.exports = new Database();
