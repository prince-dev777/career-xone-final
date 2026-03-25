require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // ✅ FIX 1: Upar le aaya

const app = express();
app.use(cors({
    origin: 'https://www.cxjeeneet.com',
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(__dirname));

// --- DATABASE CONNECTION ---
const DB_URI = process.env.MONGO_URI;

mongoose.connect(DB_URI)
    .then(() => console.log('✅ MongoDB Cloud Connected! (Database Ready)'))
    .catch((err) => console.error('❌ MongoDB Error:', err));

// ================================================================
// 📝 SCHEMAS
// ================================================================

const ContactSchema = new mongoose.Schema({ name: String, phone: String, message: String, date: { type: Date, default: Date.now } });
const Contact = mongoose.model('Contact', ContactSchema);

const AdmissionSchema = new mongoose.Schema({ name: String, school: String, course: String, phone: String, email: String, message: String, date: { type: Date, default: Date.now } });
const Admission = mongoose.model('Admission', AdmissionSchema);

const TestSeriesSchema = new mongoose.Schema({ name: String, phone: String, series: String, date: { type: Date, default: Date.now } });
const TestSeries = mongoose.model('TestSeries', TestSeriesSchema);

const ScholarshipSchema = new mongoose.Schema({ name: String, phone: String, studentClass: String, preferredDate: String, date: { type: Date, default: Date.now } });
const Scholarship = mongoose.model('Scholarship', ScholarshipSchema);

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);


// ================================================================
// 🛣️ ROUTES
// ================================================================

// ------------------------------------------------
// A. ADMIN LOGIN
// ------------------------------------------------
// ✅ FIX: Password ke special chars header mein toot jaate hain
//         isliye ek safe static token bhej rahe hain
const SAFE_TOKEN = "cxadmin_secure_token_2025"; // Ye internal token hai

app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    const SECRET_PASS = process.env.ADMIN_PASSWORD;

    if (password === SECRET_PASS) {
        res.json({ success: true, message: "Login Successful", token: SAFE_TOKEN });
    } else {
        res.json({ success: false, message: "Wrong Password" });
    }
});

// ------------------------------------------------
// B. STUDENT LOGIN & REGISTER
// ------------------------------------------------
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.json({ success: false, message: "User already exists!" });
        const newUser = new User({ email, password });
        await newUser.save();
        res.json({ success: true, message: "Registration Successful!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.post('/user-login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && user.password === password) {
            res.json({ success: true, message: "Login Successful", user: user.email });
        } else {
            res.json({ success: false, message: "Invalid Email or Password" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ------------------------------------------------
// C. PAGE ROUTES
// ------------------------------------------------
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ------------------------------------------------
// D. FORM SUBMISSIONS
// ------------------------------------------------
app.post('/contact', async (req, res) => { try { await new Contact(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/admission', async (req, res) => { try { await new Admission(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/testseries', async (req, res) => { try { await new TestSeries(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/scholarship', async (req, res) => { try { await new Scholarship(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });

// ------------------------------------------------
// E. ADMIN DATA FETCHING (Protected 🔒)
// ------------------------------------------------
const SECRET_PASS = process.env.ADMIN_PASSWORD;

const checkAuth = (req, res, next) => {
    const requestPass = req.headers['auth-token'];
    if (requestPass === SAFE_TOKEN) { // ✅ Ab SAFE_TOKEN se match hoga
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// ✅ FIX 2: Ye browser wali lines hata di (sessionStorage + fetch server pe nahi chalti)
// const token = sessionStorage.getItem("adminToken");  ← HATAYA
// const response = await fetch(...);                   ← HATAYA

app.get('/contacts', checkAuth, async (req, res) => { res.json(await Contact.find()); });
app.get('/admissions', checkAuth, async (req, res) => { res.json(await Admission.find()); });
app.get('/testseries', checkAuth, async (req, res) => { res.json(await TestSeries.find()); });
app.get('/scholarships', checkAuth, async (req, res) => { res.json(await Scholarship.find()); });
app.get('/users', checkAuth, async (req, res) => { res.json(await User.find()); });

// ------------------------------------------------
// F. DELETE ROUTES
// ------------------------------------------------
app.delete('/contacts/:id', checkAuth, async (req, res) => { await Contact.findByIdAndDelete(req.params.id); res.json({ status: "Deleted" }); });
app.delete('/admissions/:id', checkAuth, async (req, res) => { await Admission.findByIdAndDelete(req.params.id); res.json({ status: "Deleted" }); });
app.delete('/testseries/:id', checkAuth, async (req, res) => { await TestSeries.findByIdAndDelete(req.params.id); res.json({ status: "Deleted" }); });
app.delete('/scholarships/:id', checkAuth, async (req, res) => { await Scholarship.findByIdAndDelete(req.params.id); res.json({ status: "Deleted" }); });

// ================================================================
// ✅ FIX 3: module.exports BAAD mein, axios PEHLE
// ================================================================
app.listen(PORT, () => {
    console.log(`Server chal gaya! Link: http://localhost:${PORT}/admin-login`);
});

module.exports = app;

// Server ko har 14 minute mein ping karo (Render sleep se bachao)
setInterval(() => {
    axios.get('https://career-xone-final.onrender.com/admin-login')
        .then(() => console.log("✅ Server alive ping sent!"))
        .catch(() => console.log("⚠️ Ping failed, but okay."));
}, 840000);