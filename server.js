const path       = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const axios      = require('axios');

const app  = express();
const PORT = process.env.PORT || 5000;

// ================================================================
// MIDDLEWARE & HEAVY-DUTY ANTI-BOT SHIELD
// ================================================================
app.disable('x-powered-by');

// 1. Whitelist legitimate search engine crawlers & WhatsApp preview for SEO
const ALLOWED_SEARCH_BOTS = /google|googlebot|google-inspectiontool|google-site-verification|chrome-lighthouse|storebot-google|google-read-aloud|apis-google|mediapartners-google|adsbot-google|bingbot|duckduckbot|slurp|baiduspider|yandexbot|whatsapp|telegrambot|facebookexternalhit|twitterbot/i;

// 2. Blacklist automated scrapers, headless browsers, and bandwidth leechers
const BLOCKED_SCRAPERS = /selenium|puppeteer|playwright|webdriver|headlesschrome|phantomjs|python-requests|aiohttp|urllib|scrapy|wget|curl|libwww|httpclient|java|go-http-client|apache-httpclient|bytespider|gptbot|ccbot|claudebot|diffbot|ahrefsbot|semrushbot|dotbot|petalbot|dataforseobot/i;

const ipRequestTrack = new Map();

function heavyBotShield(req, res, next) {
    // Always permit legitimate form POST requests
    if (req.method === 'POST') {
        return next();
    }

    const ua = req.headers['user-agent'] || '';

    // Always allow legitimate search engine crawlers for SEO
    if (ALLOWED_SEARCH_BOTS.test(ua)) {
        return next();
    }

    // Instantly reject automated headless crawlers, scrapers, and bot libraries
    if (BLOCKED_SCRAPERS.test(ua)) {
        return res.status(403).type('text/plain').send('403 Forbidden: Automated scraper access is blocked.');
    }

    // Rate limiter (Max 120 requests/minute per client IP)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.ip || req.socket?.remoteAddress || 'unknown';
    if (ip !== '127.0.0.1' && ip !== '::1' && ip !== 'localhost') {
        const now = Date.now();
        let track = ipRequestTrack.get(ip);
        if (track) {
            if (now - track.startTime > 60000) {
                ipRequestTrack.set(ip, { count: 1, startTime: now });
            } else {
                track.count += 1;
                if (track.count > 120) {
                    return res.status(429).type('text/plain').send('429 Too Many Requests: Rate limit reached.');
                }
            }
        } else {
            ipRequestTrack.set(ip, { count: 1, startTime: now });
        }
    }

    next();
}

app.use(heavyBotShield);
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'auth-token'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(__dirname));

// ================================================================
// DATABASE (Cached Connection for Vercel Serverless & Node)
// ================================================================
let cachedDbPromise = null;

async function connectToDatabase() {
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("❌ CRITICAL: MONGO_URI environment variable is missing!");
        throw new Error("MONGO_URI environment variable is not configured.");
    }

    if (!cachedDbPromise) {
        cachedDbPromise = mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 8000,
        }).then(m => {
            console.log('✅ MongoDB Connected successfully!');
            return m;
        }).catch(err => {
            cachedDbPromise = null;
            console.error('❌ MongoDB Connection Error:', err.message);
            throw err;
        });
    }

    return cachedDbPromise;
}

// Database Connection Middleware for all API routes
app.use(async (req, res, next) => {
    const apiRoutes = [
        '/contact', '/admission', '/testseries', '/scholarship',
        '/register', '/user-login', '/admin-login',
        '/contacts', '/admissions', '/scholarships', '/users'
    ];
    const isApi = apiRoutes.some(p => req.path === p || req.path.startsWith(p + '/'));
    if (isApi) {
        try {
            await connectToDatabase();
        } catch (err) {
            return res.status(500).json({
                status: "error",
                message: "Database connection failed. Please ensure MONGO_URI is set in environment variables."
            });
        }
    }
    next();
});

// ================================================================
// AUTH — Safe session token
// ================================================================
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "cx_admin_session_auth_token_2025";

// ================================================================
// SCHEMAS
// ================================================================
const Contact = mongoose.model('Contact', new mongoose.Schema({
    name: String, phone: String, message: String,
    date: { type: Date, default: Date.now }
}));

const Admission = mongoose.model('Admission', new mongoose.Schema({
    name: String, school: String, course: String,
    phone: String, email: String, message: String,
    date: { type: Date, default: Date.now }
}));

const TestSeries = mongoose.model('TestSeries', new mongoose.Schema({
    name: String, phone: String, series: String,
    date: { type: Date, default: Date.now }
}));

const Scholarship = mongoose.model('Scholarship', new mongoose.Schema({
    name: String, phone: String, studentClass: String, preferredDate: String,
    date: { type: Date, default: Date.now }
}));

const User = mongoose.model('User', new mongoose.Schema({
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date:     { type: Date, default: Date.now }
}));

// ================================================================
// AUTH MIDDLEWARE
// ================================================================
const checkAuth = (req, res, next) => {
    const token = req.headers['auth-token'];
    if (token === ADMIN_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// ================================================================
// ROUTES — ADMIN LOGIN
// ================================================================
app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
        console.error("❌ ADMIN_PASSWORD is not set in environment variables!");
        return res.json({ 
            success: false, 
            message: "Server configuration error: ADMIN_PASSWORD is not set in env." 
        });
    }

    if (password === correctPassword) {
        res.json({ success: true, message: "Login Successful", token: ADMIN_TOKEN });
    } else {
        res.json({ success: false, message: "Wrong Password" });
    }
});

// ================================================================
// ROUTES — STUDENT AUTH
// ================================================================
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (await User.findOne({ email }))
            return res.json({ success: false, message: "User already exists!" });
        await new User({ email, password }).save();
        res.json({ success: true, message: "Registration Successful!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Server Error: " + e.message });
    }
});

app.post('/user-login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && user.password === password)
            res.json({ success: true, message: "Login Successful", user: user.email });
        else
            res.json({ success: false, message: "Invalid Email or Password" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Server Error: " + e.message });
    }
});

// ================================================================
// ROUTES — PAGE SERVE
// ================================================================
app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, 'admin-login.html')));
app.get('/admin',       (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ================================================================
// ROUTES — PUBLIC FORM SUBMISSIONS
// ================================================================
app.post('/contact',    async (req, res) => { try { await new Contact(req.body).save();    res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error", message: e.message }); } });
app.post('/admission',  async (req, res) => { try { await new Admission(req.body).save();  res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error", message: e.message }); } });
app.post('/testseries', async (req, res) => { try { await new TestSeries(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error", message: e.message }); } });
app.post('/scholarship',async (req, res) => { try { await new Scholarship(req.body).save();res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error", message: e.message }); } });

// ================================================================
// ROUTES — ADMIN DATA (Protected)
// ================================================================
app.get('/contacts',    checkAuth, async (req, res) => { try { res.json(await Contact.find().sort({ date: -1 }));    } catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });
app.get('/admissions',  checkAuth, async (req, res) => { try { res.json(await Admission.find().sort({ date: -1 }));  } catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });
app.get('/testseries',  checkAuth, async (req, res) => { try { res.json(await TestSeries.find().sort({ date: -1 })); } catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });
app.get('/scholarships',checkAuth, async (req, res) => { try { res.json(await Scholarship.find().sort({ date: -1 }));} catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });
app.get('/users',       checkAuth, async (req, res) => { try { res.json(await User.find().sort({ date: -1 }));       } catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });

// ================================================================
// ROUTES — DELETE (Protected)
// ================================================================
app.delete('/contacts/:id',    checkAuth, async (req, res) => { await Contact.findByIdAndDelete(req.params.id);    res.json({ status: "Deleted" }); });
app.delete('/admissions/:id',  checkAuth, async (req, res) => { await Admission.findByIdAndDelete(req.params.id);  res.json({ status: "Deleted" }); });
app.delete('/testseries/:id',  checkAuth, async (req, res) => { await TestSeries.findByIdAndDelete(req.params.id); res.json({ status: "Deleted" }); });
app.delete('/scholarships/:id',checkAuth, async (req, res) => { await Scholarship.findByIdAndDelete(req.params.id);res.json({ status: "Deleted" }); });

// ================================================================
// SERVER START
// ================================================================
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;

// Keep-alive ping (Only if running on Render)
if (process.env.RENDER) {
    setInterval(() => {
        axios.get('https://career-xone-final.onrender.com/admin-login')
            .catch(() => {});
    }, 840000);
}
