require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const axios      = require('axios');

const app  = express();
const PORT = process.env.PORT || 5000;

// ================================================================
// MIDDLEWARE
// ================================================================
app.use(cors({
    origin: ['https://www.cxjeeneet.com', 'https://cxjeeneet.com'],
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'auth-token'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(__dirname));

// ================================================================
// DATABASE
// ================================================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// ================================================================
// AUTH — Simple hardcoded token (no special chars, no env mismatch)
// ================================================================
// ✅ KEY FIX: Token alag hai, password alag hai
// Token HTTP headers mein safe characters wala hai
const ADMIN_TOKEN = "cxadmin2025secure";

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
    if (password === process.env.ADMIN_PASSWORD) {
        // ✅ Password verify hota hai env se, but TOKEN alag safe string bhejte hain
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
        res.status(500).json({ success: false, message: "Server Error" });
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
        res.status(500).json({ success: false, message: "Server Error" });
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
app.post('/contact',    async (req, res) => { try { await new Contact(req.body).save();    res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/admission',  async (req, res) => { try { await new Admission(req.body).save();  res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/testseries', async (req, res) => { try { await new TestSeries(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/scholarship',async (req, res) => { try { await new Scholarship(req.body).save();res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });

// ================================================================
// ROUTES — ADMIN DATA (Protected)
// ================================================================
app.get('/contacts',    checkAuth, async (req, res) => { try { res.json(await Contact.find().sort({ date: -1 }));    } catch (e) { res.status(500).json({ error: "DB Error" }); } });
app.get('/admissions',  checkAuth, async (req, res) => { try { res.json(await Admission.find().sort({ date: -1 }));  } catch (e) { res.status(500).json({ error: "DB Error" }); } });
app.get('/testseries',  checkAuth, async (req, res) => { try { res.json(await TestSeries.find().sort({ date: -1 })); } catch (e) { res.status(500).json({ error: "DB Error" }); } });
app.get('/scholarships',checkAuth, async (req, res) => { try { res.json(await Scholarship.find().sort({ date: -1 }));} catch (e) { res.status(500).json({ error: "DB Error" }); } });
app.get('/users',       checkAuth, async (req, res) => { try { res.json(await User.find().sort({ date: -1 }));       } catch (e) { res.status(500).json({ error: "DB Error" }); } });

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
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;

// Keep-alive ping (Render free tier ke liye)
setInterval(() => {
    axios.get('https://career-xone-final.onrender.com/admin-login')
        .then(() => console.log("✅ Keep-alive ping sent"))
        .catch(() => console.log("⚠️ Ping failed"));
}, 840000); // Har 14 min