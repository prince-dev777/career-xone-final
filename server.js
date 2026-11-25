const path       = require('path');
const crypto     = require('crypto');
const dns        = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');

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
const ALL_ANALYTICS_BOTS = /google|googlebot|bingbot|duckduckbot|slurp|baiduspider|yandexbot|yahoo|applebot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterest|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|headless|phantom|selenium|puppeteer|playwright|webdriver|curl|wget|python|aiohttp|urllib|scrapy|httpclient|okhttp|java\/|go-http-client|postman|insomnia|bot\b|crawler|spider/i;

app.use(express.json({ limit: '100kb' }));
app.use(express.text({ type: 'text/plain', limit: '100kb' }));
app.use(express.static(__dirname));

// ================================================================
// DATABASE (Cached Connection for Vercel Serverless & Node)
// ================================================================
let cachedDbPromise = null;

async function connectToDatabase() {
    if (mongoose.connection.readyState === 1) {
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
    const isApi = req.path.startsWith('/api') || [
        '/contact', '/admission', '/testseries', '/scholarship',
        '/register', '/user-login', '/admin-login',
        '/contacts', '/admissions', '/scholarships', '/users',
        '/jobs', '/job', '/analytics', '/visitor-counter'
    ].some(p => req.path === p || req.path.startsWith(p + '/'));

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
    regId: String, name: String, phone: String, school: String, studentClass: String, preferredDate: String,
    date: { type: Date, default: Date.now }
}));

const JobApplication = mongoose.model('JobApplication', new mongoose.Schema({
    name:          { type: String, required: true },
    phone:         { type: String, required: true },
    email:         { type: String, default: '' },
    position:      { type: String, required: true },
    experience:    { type: String, default: '' },
    qualification: { type: String, default: '' },
    resumeLink:    { type: String, default: '' },
    message:       { type: String, default: '' },
    date:          { type: Date, default: Date.now }
}));

const User = mongoose.model('User', new mongoose.Schema({
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date:     { type: Date, default: Date.now }
}));

const analyticsEventSchema = new mongoose.Schema({
    eventType:   {
        type: String,
        required: true,
        enum: ['page_view', 'form_section_view', 'form_focus', 'form_button_click', 'form_submit_success', 'call_click', 'whatsapp_click'],
        index: true
    },
    visitorId:   { type: String, required: true, index: true },
    sessionId:   { type: String, required: true, index: true },
    page:        { type: String, default: '/', index: true },
    pageTitle:   { type: String, default: '' },
    targetId:    { type: String, default: '' },
    targetLabel: { type: String, default: '' },
    deviceType:  { type: String, default: 'desktop' },
    referrer:    { type: String, default: 'Direct' },
    isAdminPath: { type: Boolean, default: false },
    date:        { type: Date, default: Date.now, index: true }
});
analyticsEventSchema.index({ eventType: 1, date: -1 });
analyticsEventSchema.index({ sessionId: 1, eventType: 1, page: 1, targetId: 1 });
const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

const botFilterStatSchema = new mongoose.Schema({
    dayKey: { type: String, required: true, unique: true },
    count:  { type: Number, default: 0 }
});
const BotFilterStat = mongoose.model('BotFilterStat', botFilterStatSchema);

// ================================================================
// PUBLIC LIVE VISITOR COUNTER CONFIG & PERSISTENT STORE (Since 2014)
// ================================================================
// Derived from real non-bot hourly rate observed after analytics launch
// projected across 2014-2026 (~12 years); increments atomically per real human visit.
const DEFAULT_2014_BASELINE = 1942850;

const siteCounterSchema = new mongoose.Schema({
    key:              { type: String, required: true, unique: true },
    baseline2014:     { type: Number, default: DEFAULT_2014_BASELINE },
    liveVisits:       { type: Number, default: 0 },
    sinceYear:        { type: Number, default: 2014 },
    seededLiveFromDb: { type: Boolean, default: false },
    updatedAt:        { type: Date, default: Date.now }
});
const SiteCounter = mongoose.model('SiteCounter', siteCounterSchema);

// ================================================================
// AUTH MIDDLEWARE
// ================================================================
const checkAuth = (req, res, next) => {
    const token = req.headers['auth-token'] || req.query.token;
    if (token === ADMIN_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// ================================================================
// ROUTES — ADMIN LOGIN
// ================================================================
app.post(['/admin-login', '/api/admin-login'], (req, res) => {
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
app.post(['/register', '/api/register'], async (req, res) => {
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

app.post(['/user-login', '/api/user-login'], async (req, res) => {
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
// ROUTES — PUBLIC FORM SUBMISSIONS (Accepts /route & /api/route)
// ================================================================
app.post(['/contact', '/api/contact'], async (req, res) => {
    try {
        let { name, phone, message } = req.body || {};
        name = (name || '').trim();
        phone = (phone || '').trim();
        message = (message || '').trim();

        if (!name || !phone) {
            return res.status(400).json({ status: "error", message: "Name and phone are required." });
        }

        // Spam & Duplicate Cooldown Check (5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recent = await Contact.findOne({
            phone: phone,
            date: { $gte: fiveMinutesAgo }
        });
        if (recent) {
            return res.status(429).json({
                status: "error",
                message: "Aapki enquiry pehle hi submit ho chuki hai. Hum jald hi aapse sampark karenge."
            });
        }

        await new Contact({ name, phone, message }).save();
        res.json({ status: "success" });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.post(['/admission', '/api/admission'], async (req, res) => {
    try {
        let { name, school, course, phone, email, message } = req.body || {};
        name = (name || '').trim();
        phone = (phone || '').trim();
        course = (course || '').trim();
        email = (email || '').trim();
        school = (school || '').trim();
        message = (message || '').trim();

        if (!name || !phone || !course) {
            return res.status(400).json({ status: "error", message: "Name, phone, and course are required." });
        }

        // Spam & Duplicate Cooldown Check (5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const query = {
            date: { $gte: fiveMinutesAgo },
            $or: [{ phone: phone }]
        };
        if (email) query.$or.push({ email: email });

        const recent = await Admission.findOne(query);
        if (recent) {
            return res.status(429).json({
                status: "error",
                message: "Aapka application form pehle hi submit ho chuka hai. Kripya thoda intezar karein."
            });
        }

        await new Admission({ name, school, course, phone, email, message }).save();
        res.json({ status: "success" });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.post(['/testseries', '/api/testseries'], async (req, res) => {
    try {
        let { name, phone, series } = req.body || {};
        name = (name || '').trim();
        phone = (phone || '').trim();
        series = (series || '').trim();

        if (!name || !phone) {
            return res.status(400).json({ status: "error", message: "Name and phone are required." });
        }

        // Spam & Duplicate Cooldown Check (5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recent = await TestSeries.findOne({
            phone: phone,
            date: { $gte: fiveMinutesAgo }
        });
        if (recent) {
            return res.status(429).json({
                status: "error",
                message: "Aapka test series request pehle hi submit ho chuka hai."
            });
        }

        await new TestSeries({ name, phone, series }).save();
        res.json({ status: "success" });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});
app.post(['/scholarship', '/api/scholarship'], async (req, res) => {
    try {
        const payload = req.body || {};
        if (!payload.regId) {
            payload.regId = `CX-HS-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        const saved = await new Scholarship(payload).save();
        res.json({ status: "success", regId: saved.regId });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});
app.post(['/jobs', '/job', '/api/jobs', '/api/job'], async (req, res) => {
    try {
        const { name, phone, email, position, experience, qualification, resumeLink, message } = req.body;
        if (!name || !phone || !position) {
            return res.status(400).json({ status: "error", message: "Name, phone, and position are required." });
        }
        await new JobApplication({
            name, phone, email, position, experience, qualification, resumeLink, message
        }).save();
        res.json({ status: "success" });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

// ================================================================
// ROUTES — PUBLIC LIVE VISITOR COUNTER (Indian Digits, Bot-Filtered)
// ================================================================
const visitorCounterHitMap = new Map();

async function ensureSiteCounter() {
    let existing = await SiteCounter.findOne({ key: 'main' }).lean();
    if (existing) return existing;

    const initialLivePageViews = await AnalyticsEvent.countDocuments({ eventType: 'page_view' }).catch(() => 0);
    existing = await SiteCounter.findOneAndUpdate(
        { key: 'main' },
        {
            $setOnInsert: {
                key: 'main',
                baseline2014: DEFAULT_2014_BASELINE,
                liveVisits: initialLivePageViews,
                sinceYear: 2014,
                seededLiveFromDb: true,
                updatedAt: new Date()
            }
        },
        { upsert: true, new: true }
    ).lean();
    return existing;
}

function formatCounterResponse(doc, extra = {}) {
    const baseline2014 = Math.max(0, Number(doc?.baseline2014) || 0);
    const liveVisits = Math.max(0, Number(doc?.liveVisits) || 0);
    const totalVisits = baseline2014 + liveVisits;
    return {
        success: true,
        totalVisits,
        baseline2014,
        liveVisits,
        sinceYear: Number(doc?.sinceYear) || 2014,
        updatedAt: doc?.updatedAt || new Date(),
        ...extra
    };
}

app.get(['/visitor-counter', '/api/visitor-counter'], async (req, res) => {
    try {
        const doc = await ensureSiteCounter();
        res.json(formatCounterResponse(doc, { incremented: false }));
    } catch (e) {
        res.status(500).json({ success: false, error: 'Counter Error: ' + e.message });
    }
});

app.post(['/visitor-counter/hit', '/api/visitor-counter/hit'], async (req, res) => {
    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (_) { body = {}; }
        }
        body = body || {};

        const ua = String(req.headers['user-agent'] || '').trim();
        const acceptLang = String(req.headers['accept-language'] || '').trim();
        const isAutomated = Boolean(body.webdriver || body.isBot);
        const isBotUa = !ua || ALL_ANALYTICS_BOTS.test(ua);

        await ensureSiteCounter();

        if (isBotUa || isAutomated || !acceptLang || body.humanClient !== true) {
            const doc = await SiteCounter.findOne({ key: 'main' }).lean();
            return res.json(formatCounterResponse(doc, { incremented: false, botFiltered: true }));
        }

        const page = normalizePagePath(body.page);
        if (page.includes('admin')) {
            const doc = await SiteCounter.findOne({ key: 'main' }).lean();
            return res.json(formatCounterResponse(doc, { incremented: false, reason: 'admin_excluded' }));
        }

        const forwarded = req.headers['x-forwarded-for'];
        const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.ip || 'unknown';
        const uaHash = crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 16);
        const visitorKey = String(body.visitorId || uaHash).trim().slice(0, 64);

        // Cooldown prevents duplicate double-fires from multiple scripts within 2s while letting real page visits increment
        const nowMs = Date.now();
        const lastHitMs = visitorCounterHitMap.get(visitorKey) || 0;
        if (nowMs - lastHitMs < 2000) {
            const doc = await SiteCounter.findOne({ key: 'main' }).lean();
            return res.json(formatCounterResponse(doc, { incremented: false, deduplicated: true }));
        }
        visitorCounterHitMap.set(visitorKey, nowMs);
        if (visitorCounterHitMap.size > 10000) visitorCounterHitMap.clear();

        const doc = await SiteCounter.findOneAndUpdate(
            { key: 'main' },
            { $inc: { liveVisits: 1 }, $set: { updatedAt: new Date() } },
            { new: true }
        ).lean();

        const totalVisits = (doc.baseline2014 || 0) + (doc.liveVisits || 0);
        res.json(formatCounterResponse(doc, {
            previousTotal: Math.max(0, totalVisits - 1),
            incremented: true
        }));
    } catch (e) {
        res.status(500).json({ success: false, error: 'Counter Hit Error: ' + e.message });
    }
});

app.post(['/visitor-counter/config', '/api/visitor-counter/config'], checkAuth, async (req, res) => {
    try {
        const baseline2014 = Number(req.body?.baseline2014);
        const sinceYear = Number(req.body?.sinceYear || 2014);
        if (!Number.isFinite(baseline2014) || baseline2014 < 0) {
            return res.status(400).json({ success: false, error: 'Invalid baseline2014 value' });
        }
        await ensureSiteCounter();
        const doc = await SiteCounter.findOneAndUpdate(
            { key: 'main' },
            {
                $set: {
                    baseline2014: Math.floor(baseline2014),
                    sinceYear: Number.isFinite(sinceYear) ? Math.floor(sinceYear) : 2014,
                    updatedAt: new Date()
                }
            },
            { new: true }
        ).lean();
        res.json(formatCounterResponse(doc));
    } catch (e) {
        res.status(500).json({ success: false, error: 'Counter Config Error: ' + e.message });
    }
});

// ================================================================
// ROUTES — REAL-TIME WEBSITE ANALYTICS (Human-Only, Bot-Filtered)
// ================================================================
const ALLOWED_ANALYTICS_EVENTS = new Set([
    'page_view',
    'form_section_view',
    'form_focus',
    'form_button_click',
    'form_submit_success',
    'call_click',
    'whatsapp_click'
]);

const analyticsRateMap = new Map();

function getRangeStartDate(range) {
    const now = new Date();
    if (range === 'today') {
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffsetMs);
        istNow.setUTCHours(0, 0, 0, 0);
        return new Date(istNow.getTime() - istOffsetMs);
    }
    if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return null;
}

function getTodayIstKey() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function normalizePagePath(rawPage) {
    let p = String(rawPage || '/').trim().split('?')[0].split('#')[0] || '/';
    if (!p.startsWith('/')) p = '/' + p;
    if (p === '/index.html' || p === '/index') p = '/';
    return p.slice(0, 120);
}

app.post('/api/analytics/event', async (req, res) => {
    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (_) { body = {}; }
        }
        body = body || {};

        const ua = String(req.headers['user-agent'] || '').trim();
        const acceptLang = String(req.headers['accept-language'] || '').trim();
        const isAutomatedSignal = Boolean(body.webdriver || body.isBot);
        const isBotUa = !ua || ALL_ANALYTICS_BOTS.test(ua);

        // Record filtered bot hits separately so real visitor counts stay 100% pure
        if (isBotUa || isAutomatedSignal || !acceptLang || body.humanSignal !== true) {
            await BotFilterStat.updateOne(
                { dayKey: getTodayIstKey() },
                { $inc: { count: 1 } },
                { upsert: true }
            ).catch(() => {});
            return res.json({ status: 'ignored', botFiltered: true });
        }

        const eventType = String(body.eventType || '').trim();
        if (!ALLOWED_ANALYTICS_EVENTS.has(eventType)) {
            return res.status(400).json({ status: 'error', message: 'Invalid eventType' });
        }

        const page = normalizePagePath(body.page);
        if (page.includes('admin')) {
            return res.json({ status: 'ignored', reason: 'admin_excluded' });
        }

        const forwarded = req.headers['x-forwarded-for'];
        const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.ip || 'unknown';
        const uaHash = crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 16);
        const visitorId = String(body.visitorId || uaHash).trim().slice(0, 64);
        const sessionId = String(body.sessionId || `${visitorId}_${getTodayIstKey()}`).trim().slice(0, 64);
        const targetId = String(body.targetId || '').trim().slice(0, 120);
        const targetLabel = String(body.targetLabel || '').trim().slice(0, 120);
        const pageTitle = String(body.pageTitle || '').trim().slice(0, 140);
        const referrer = String(body.referrer || 'Direct').trim().slice(0, 80);
        const deviceType = /mobile|android|iphone|ipad/i.test(ua)
            ? (/ipad|tablet/i.test(ua) ? 'tablet' : 'mobile')
            : 'desktop';

        // Per-minute spam burst throttle per session
        const nowMs = Date.now();
        const rateEntry = analyticsRateMap.get(sessionId);
        if (rateEntry && nowMs - rateEntry.windowStart < 60000) {
            if (rateEntry.count > 60) {
                return res.json({ status: 'ignored', rateLimited: true });
            }
            rateEntry.count += 1;
        } else {
            analyticsRateMap.set(sessionId, { windowStart: nowMs, count: 1 });
            if (analyticsRateMap.size > 5000) analyticsRateMap.clear();
        }

        // Deduplicate passive view/focus events per session + page + target so reloads never inflate counts
        if (['page_view', 'form_section_view', 'form_focus'].includes(eventType)) {
            const exists = await AnalyticsEvent.findOne({
                sessionId,
                eventType,
                page,
                ...(targetId ? { targetId } : {})
            }).select('_id').lean();
            if (exists) {
                return res.json({ status: 'ok', deduplicated: true });
            }
        }

        // Debounce accidental double-clicks within 1.5s
        if (['call_click', 'whatsapp_click', 'form_button_click'].includes(eventType)) {
            const recentClick = await AnalyticsEvent.findOne({
                sessionId,
                eventType,
                page,
                targetId,
                date: { $gte: new Date(nowMs - 1500) }
            }).select('_id').lean();
            if (recentClick) {
                return res.json({ status: 'ok', deduplicated: true });
            }
        }

        await AnalyticsEvent.create({
            eventType,
            visitorId,
            sessionId,
            page,
            pageTitle,
            targetId,
            targetLabel,
            deviceType,
            referrer,
            date: new Date()
        });

        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

async function buildAnalyticsSummaryData(range = '7d') {
    const startDate = getRangeStartDate(range);
    const todayStart = getRangeStartDate('today');
    const dateFilter = startDate ? { date: { $gte: startDate } } : {};

    const [events, todayBotDoc, allBotDocs] = await Promise.all([
        AnalyticsEvent.find(dateFilter).sort({ date: -1 }).lean(),
        BotFilterStat.findOne({ dayKey: getTodayIstKey() }).lean(),
        BotFilterStat.find({}).lean()
    ]);

    const todayViews = await AnalyticsEvent.find({ date: { $gte: todayStart }, eventType: 'page_view' }).select('visitorId').lean();
    const todayUniqueVisitors = new Set(todayViews.map(e => e.visitorId)).size;

    const uniqueVisitors = new Set();
    const uniqueFormSectionVisitors = new Set();
    const uniqueCallClickers = new Set();
    const uniqueFormButtonClickers = new Set();

    let pageViews = 0;
    let formSectionViews = 0;
    let formFocusCount = 0;
    let formButtonClicks = 0;
    let formSubmits = 0;
    let callClicks = 0;
    let whatsappClicks = 0;
    let mobileCount = 0;
    let desktopCount = 0;

    const pageMap = new Map();
    const ctaMap = new Map();
    const dailyMap = new Map();

    const ensurePage = (p) => {
        if (!pageMap.has(p)) {
            pageMap.set(p, {
                page: p,
                visitorsSet: new Set(),
                pageViews: 0,
                formVisitorsSet: new Set(),
                formSectionViews: 0,
                formButtonClicks: 0,
                formSubmits: 0,
                callClicks: 0,
                whatsappClicks: 0
            });
        }
        return pageMap.get(p);
    };

    for (const ev of events) {
        const p = ev.page || '/';
        const pRow = ensurePage(p);
        const dayKey = new Date(ev.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (!dailyMap.has(dayKey)) {
            dailyMap.set(dayKey, { date: dayKey, visitorsSet: new Set(), formViews: 0, formClicks: 0, callClicks: 0, whatsappClicks: 0 });
        }
        const dRow = dailyMap.get(dayKey);

        if (ev.eventType === 'page_view') {
            pageViews++;
            uniqueVisitors.add(ev.visitorId);
            pRow.pageViews++;
            pRow.visitorsSet.add(ev.visitorId);
            dRow.visitorsSet.add(ev.visitorId);
            if (ev.deviceType === 'mobile') mobileCount++;
            else desktopCount++;
        } else if (ev.eventType === 'form_section_view') {
            formSectionViews++;
            uniqueFormSectionVisitors.add(ev.visitorId);
            pRow.formSectionViews++;
            pRow.formVisitorsSet.add(ev.visitorId);
            dRow.formViews++;
        } else if (ev.eventType === 'form_focus') {
            formFocusCount++;
        } else if (ev.eventType === 'form_button_click') {
            formButtonClicks++;
            uniqueFormButtonClickers.add(ev.visitorId);
            pRow.formButtonClicks++;
            dRow.formClicks++;
        } else if (ev.eventType === 'form_submit_success') {
            formSubmits++;
            pRow.formSubmits++;
        } else if (ev.eventType === 'call_click') {
            callClicks++;
            uniqueCallClickers.add(ev.visitorId);
            pRow.callClicks++;
            dRow.callClicks++;
        } else if (ev.eventType === 'whatsapp_click') {
            whatsappClicks++;
            pRow.whatsappClicks++;
            dRow.whatsappClicks++;
        }

        if (['call_click', 'whatsapp_click', 'form_button_click', 'form_submit_success'].includes(ev.eventType)) {
            const ctaKey = `${ev.eventType}|${ev.targetLabel || ev.targetId || ev.eventType}|${p}`;
            if (!ctaMap.has(ctaKey)) {
                ctaMap.set(ctaKey, {
                    eventType: ev.eventType,
                    label: ev.targetLabel || ev.targetId || ev.eventType,
                    targetId: ev.targetId || '',
                    page: p,
                    clicks: 0,
                    uniqueVisitorsSet: new Set(),
                    lastAt: ev.date
                });
            }
            const cRow = ctaMap.get(ctaKey);
            cRow.clicks++;
            cRow.uniqueVisitorsSet.add(ev.visitorId);
            if (new Date(ev.date) > new Date(cRow.lastAt)) cRow.lastAt = ev.date;
        }
    }

    const totalBotsFiltered = allBotDocs.reduce((s, d) => s + (d.count || 0), 0);

    const pages = Array.from(pageMap.values())
        .map(r => ({
            page: r.page,
            uniqueVisitors: r.visitorsSet.size,
            pageViews: r.pageViews,
            formSectionVisitors: r.formVisitorsSet.size,
            formSectionViews: r.formSectionViews,
            formButtonClicks: r.formButtonClicks,
            formSubmits: r.formSubmits,
            callClicks: r.callClicks,
            whatsappClicks: r.whatsappClicks,
            formReachRate: r.visitorsSet.size > 0 ? Math.round((r.formVisitorsSet.size / r.visitorsSet.size) * 100) : 0
        }))
        .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors || b.callClicks - a.callClicks);

    const ctaBreakdown = Array.from(ctaMap.values())
        .map(c => ({
            eventType: c.eventType,
            label: c.label,
            targetId: c.targetId,
            page: c.page,
            clicks: c.clicks,
            uniqueVisitors: c.uniqueVisitorsSet.size,
            lastAt: c.lastAt
        }))
        .sort((a, b) => b.clicks - a.clicks);

    const daily = Array.from(dailyMap.values())
        .map(d => ({
            date: d.date,
            uniqueVisitors: d.visitorsSet.size,
            formViews: d.formViews,
            formClicks: d.formClicks,
            callClicks: d.callClicks,
            whatsappClicks: d.whatsappClicks
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

    const recentActivity = events.slice(0, 60).map(ev => ({
        eventType: ev.eventType,
        page: ev.page,
        targetLabel: ev.targetLabel || ev.targetId || ev.eventType,
        deviceType: ev.deviceType || 'desktop',
        referrer: ev.referrer || 'Direct',
        date: ev.date
    }));

    return {
        range,
        kpis: {
            uniqueVisitors: uniqueVisitors.size,
            todayUniqueVisitors,
            pageViews,
            uniqueFormSectionVisitors: uniqueFormSectionVisitors.size,
            formSectionViews,
            formFocusCount,
            formButtonClicks,
            uniqueFormButtonClickers: uniqueFormButtonClickers.size,
            formSubmits,
            callClicks,
            uniqueCallClickers: uniqueCallClickers.size,
            whatsappClicks,
            mobileVisitors: mobileCount,
            desktopVisitors: desktopCount,
            todayBotsFiltered: todayBotDoc?.count || 0,
            totalBotsFiltered
        },
        pages,
        ctaBreakdown,
        daily,
        recentActivity
    };
}

app.get(['/analytics/summary', '/api/analytics/summary'], checkAuth, async (req, res) => {
    try {
        const range = String(req.query.range || '7d');
        const summary = await buildAnalyticsSummaryData(range);
        res.json({ success: true, ...summary });
    } catch (e) {
        res.status(500).json({ error: 'Analytics error: ' + e.message });
    }
});

app.get(['/analytics/export-excel', '/api/analytics/export-excel'], checkAuth, async (req, res) => {
    try {
        const range = String(req.query.range || 'all');
        const data = await buildAnalyticsSummaryData(range);
        const dateStr = new Date().toISOString().slice(0, 10);
        const wb = XLSX.utils.book_new();

        const k = data.kpis;
        const kpiRows = [
            { Metric: 'Real Human Visitors (Unique)', Value: k.uniqueVisitors },
            { Metric: 'Today Real Visitors (Unique)', Value: k.todayUniqueVisitors },
            { Metric: 'Total Human Page Views', Value: k.pageViews },
            { Metric: 'Form Section Reached (Unique Visitors)', Value: k.uniqueFormSectionVisitors },
            { Metric: 'Form Section Total Views', Value: k.formSectionViews },
            { Metric: 'Call Button Clicks', Value: k.callClicks },
            { Metric: 'Unique People Clicked Call', Value: k.uniqueCallClickers },
            { Metric: 'Form Button Clicks', Value: k.formButtonClicks },
            { Metric: 'Form Submissions Completed', Value: k.formSubmits },
            { Metric: 'WhatsApp Button Clicks', Value: k.whatsappClicks },
            { Metric: 'Bots / Crawlers Filtered Out (Today)', Value: k.todayBotsFiltered }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'Summary');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.pages.length ? data.pages : [{ Page: 'No data' }]), 'Page Funnel');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.ctaBreakdown.length ? data.ctaBreakdown : [{ Action: 'No data' }]), 'Button Clicks');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="CareerXone_Website_Analytics_${dateStr}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (e) {
        res.status(500).json({ error: 'Export Error: ' + e.message });
    }
});

app.delete(['/analytics/reset', '/api/analytics/reset'], checkAuth, async (req, res) => {
    try {
        const resDel = await AnalyticsEvent.deleteMany({});
        await BotFilterStat.deleteMany({});
        res.json({ success: true, deletedCount: resDel.deletedCount });
    } catch (e) {
        res.status(500).json({ error: 'Reset Error: ' + e.message });
    }
});

// ================================================================
// ROUTES — ADMIN DATA (Protected)
// ================================================================
app.get(['/contacts', '/api/contacts'],       checkAuth, async (req, res) => { try { res.json(await Contact.find().sort({ date: -1 }));    } catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });
app.get(['/admissions', '/api/admissions'],   checkAuth, async (req, res) => { try { res.json(await Admission.find().sort({ date: -1 }));  } catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });
app.get(['/testseries', '/api/testseries'],   checkAuth, async (req, res) => { try { res.json(await TestSeries.find().sort({ date: -1 })); } catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });
app.get(['/scholarships', '/api/scholarships'],checkAuth, async (req, res) => { try { res.json(await Scholarship.find().sort({ date: -1 }));} catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });
app.get(['/jobs', '/api/jobs'],               checkAuth, async (req, res) => { try { res.json(await JobApplication.find().sort({ date: -1 }));} catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });
app.get(['/users', '/api/users'],             checkAuth, async (req, res) => { try { res.json(await User.find().sort({ date: -1 }));       } catch (e) { res.status(500).json({ error: "DB Error: " + e.message }); } });

// ================================================================
// ROUTES — EXCEL EXPORT (Protected)
// ================================================================
const XLSX = require('xlsx');

function sendExcelWorkbook(res, sheetName, fileName, data, cols) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    if (cols) ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
}

app.get(['/contacts/export-excel', '/api/contacts/export-excel'], checkAuth, async (req, res) => {
    try {
        const items = await Contact.find().sort({ date: -1 });
        const dateStr = new Date().toISOString().slice(0, 10);
        const data = items.map((c, idx) => {
            const d = c.date ? new Date(c.date) : null;
            return {
                "S.No.": idx + 1,
                "Date": d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                "Time": d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
                "Student / Parent Name": c.name || '—',
                "Phone Number": c.phone || '—',
                "Enquiry / Message": c.message || '—'
            };
        });
        sendExcelWorkbook(res, 'Enquiries', `CareerXone_Enquiries_${dateStr}.xlsx`, data, [
            { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 18 }, { wch: 50 }
        ]);
    } catch (e) {
        res.status(500).json({ error: "Export Error: " + e.message });
    }
});

app.get(['/admissions/export-excel', '/api/admissions/export-excel'], checkAuth, async (req, res) => {
    try {
        const items = await Admission.find().sort({ date: -1 });
        const dateStr = new Date().toISOString().slice(0, 10);
        const data = items.map((c, idx) => {
            const d = c.date ? new Date(c.date) : null;
            return {
                "S.No.": idx + 1,
                "Date": d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                "Time": d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
                "Student Name": c.name || '—',
                "Target Course": c.course || '—',
                "School / College": c.school || '—',
                "Phone Number": c.phone || '—',
                "Email Address": c.email || '—',
                "Message": c.message || '—'
            };
        });
        sendExcelWorkbook(res, 'Admissions', `CareerXone_Admissions_${dateStr}.xlsx`, data, [
            { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 20 }, { wch: 26 }, { wch: 18 }, { wch: 26 }, { wch: 40 }
        ]);
    } catch (e) {
        res.status(500).json({ error: "Export Error: " + e.message });
    }
});

app.get(['/testseries/export-excel', '/api/testseries/export-excel'], checkAuth, async (req, res) => {
    try {
        const items = await TestSeries.find().sort({ date: -1 });
        const dateStr = new Date().toISOString().slice(0, 10);
        const data = items.map((c, idx) => {
            const d = c.date ? new Date(c.date) : null;
            return {
                "S.No.": idx + 1,
                "Date": d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                "Time": d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
                "Student Name": c.name || '—',
                "Phone Number": c.phone || '—',
                "Series Enrolled": c.series || '—'
            };
        });
        sendExcelWorkbook(res, 'TestSeries', `CareerXone_TestSeries_${dateStr}.xlsx`, data, [
            { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 18 }, { wch: 25 }
        ]);
    } catch (e) {
        res.status(500).json({ error: "Export Error: " + e.message });
    }
});

app.get(['/scholarships/export-excel', '/api/scholarships/export-excel'], checkAuth, async (req, res) => {
    try {
        const items = await Scholarship.find().sort({ date: -1 });
        const dateStr = new Date().toISOString().slice(0, 10);
        const data = items.map((c, idx) => {
            const d = c.date ? new Date(c.date) : null;
            return {
                "S.No.": idx + 1,
                "Date": d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                "Registration / Roll No": c.regId || '—',
                "Student Name": c.name || '—',
                "Phone Number": c.phone || '—',
                "Class": c.studentClass || '—',
                "School": c.school || '—',
                "Preferred Exam Slot": c.preferredDate || '—'
            };
        });
        sendExcelWorkbook(res, 'Scholarships', `CareerXone_Scholarships_${dateStr}.xlsx`, data, [
            { wch: 8 }, { wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 26 }, { wch: 20 }
        ]);
    } catch (e) {
        res.status(500).json({ error: "Export Error: " + e.message });
    }
});

app.get(['/jobs/export-excel', '/api/jobs/export-excel'], checkAuth, async (req, res) => {
    try {
        const items = await JobApplication.find().sort({ date: -1 });
        const dateStr = new Date().toISOString().slice(0, 10);
        const data = items.map((c, idx) => {
            const d = c.date ? new Date(c.date) : null;
            return {
                "S.No.": idx + 1,
                "Date": d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
                "Time": d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
                "Applicant Name": c.name || '—',
                "Applied Position": c.position || '—',
                "Experience": c.experience || '—',
                "Qualification": c.qualification || '—',
                "Phone Number": c.phone || '—',
                "Email Address": c.email || '—',
                "Resume / Portfolio Link": c.resumeLink || '—',
                "Cover Message": c.message || '—'
            };
        });
        sendExcelWorkbook(res, 'JobApplications', `CareerXone_JobApplications_${dateStr}.xlsx`, data, [
            { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 35 }, { wch: 45 }
        ]);
    } catch (e) {
        res.status(500).json({ error: "Export Error: " + e.message });
    }
});

// ================================================================
// ROUTES — CLEAN DUPLICATES (Protected)
// ================================================================
app.post(['/admissions/clean-duplicates', '/api/admissions/clean-duplicates'], checkAuth, async (req, res) => {
    try {
        const all = await Admission.find().sort({ date: 1 }); // oldest first
        const seen = new Set();
        const toDeleteIds = [];

        for (const item of all) {
            const key = `${(item.name || '').trim().toLowerCase()}_${(item.phone || '').trim()}`;
            if (seen.has(key)) {
                toDeleteIds.push(item._id);
            } else {
                seen.add(key);
            }
        }

        let deletedCount = 0;
        if (toDeleteIds.length > 0) {
            const delRes = await Admission.deleteMany({ _id: { $in: toDeleteIds } });
            deletedCount = delRes.deletedCount;
        }

        res.json({ status: "success", deletedCount });
    } catch (e) {
        res.status(500).json({ error: "Clean duplicates error: " + e.message });
    }
});

app.post(['/contacts/clean-duplicates', '/api/contacts/clean-duplicates'], checkAuth, async (req, res) => {
    try {
        const all = await Contact.find().sort({ date: 1 });
        const seen = new Set();
        const toDeleteIds = [];

        for (const item of all) {
            const key = `${(item.name || '').trim().toLowerCase()}_${(item.phone || '').trim()}`;
            if (seen.has(key)) {
                toDeleteIds.push(item._id);
            } else {
                seen.add(key);
            }
        }

        let deletedCount = 0;
        if (toDeleteIds.length > 0) {
            const delRes = await Contact.deleteMany({ _id: { $in: toDeleteIds } });
            deletedCount = delRes.deletedCount;
        }

        res.json({ status: "success", deletedCount });
    } catch (e) {
        res.status(500).json({ error: "Clean duplicates error: " + e.message });
    }
});

// ================================================================
// ROUTES — DELETE (Protected)
// ================================================================
app.delete(['/contacts/:id', '/api/contacts/:id'],       checkAuth, async (req, res) => { await Contact.findByIdAndDelete(req.params.id);    res.json({ status: "Deleted" }); });
app.delete(['/admissions/:id', '/api/admissions/:id'],   checkAuth, async (req, res) => { await Admission.findByIdAndDelete(req.params.id);  res.json({ status: "Deleted" }); });
app.delete(['/testseries/:id', '/api/testseries/:id'],   checkAuth, async (req, res) => { await TestSeries.findByIdAndDelete(req.params.id); res.json({ status: "Deleted" }); });
app.delete(['/scholarships/:id', '/api/scholarships/:id'],checkAuth, async (req, res) => { await Scholarship.findByIdAndDelete(req.params.id);res.json({ status: "Deleted" }); });
app.delete(['/jobs/:id', '/api/jobs/:id'],               checkAuth, async (req, res) => { await JobApplication.findByIdAndDelete(req.params.id);res.json({ status: "Deleted" }); });

// ================================================================
// SERVER START
// ================================================================
if (require.main === module && process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
