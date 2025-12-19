const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// ✅ STATIC FILES FIX
app.use(express.static(__dirname));

// --- DATABASE CONNECTION ---
const DB_URI = "mongodb+srv://botxone5_db_user:zsZowDgeuRg5nWy5@cluster0.l60r7uk.mongodb.net/careerXoneDB?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(DB_URI)
    .then(() => console.log('✅ MongoDB Cloud Connected! (Database Ready)'))
    .catch((err) => console.error('❌ MongoDB Error:', err));

// ================================================================
// 📝 SCHEMAS (Database Design)
// ================================================================

// 1. Forms Data Schemas
const ContactSchema = new mongoose.Schema({ name: String, phone: String, message: String, date: { type: Date, default: Date.now } });
const Contact = mongoose.model('Contact', ContactSchema);

const AdmissionSchema = new mongoose.Schema({ name: String, school: String, course: String, phone: String, email: String, message: String, date: { type: Date, default: Date.now } });
const Admission = mongoose.model('Admission', AdmissionSchema);

const TestSeriesSchema = new mongoose.Schema({ name: String, phone: String, series: String, date: { type: Date, default: Date.now } });
const TestSeries = mongoose.model('TestSeries', TestSeriesSchema);

const ScholarshipSchema = new mongoose.Schema({ name: String, phone: String, studentClass: String, preferredDate: String, date: { type: Date, default: Date.now } });
const Scholarship = mongoose.model('Scholarship', ScholarshipSchema);

// 2. 👤 USER SCHEMA (Student Login/Register ke liye)
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Note: Real project me password hash karna chahiye
    date: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);


// ================================================================
// 🛣️ ROUTES (Raaste)
// ================================================================

// ------------------------------------------------
// A. ADMIN LOGIN SYSTEM
// ------------------------------------------------
app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    const SECRET_PASS = "CareerXone{@2025$RohitJaa}"; // Admin Password

    if (password === SECRET_PASS) {
        res.json({ 
            success: true, 
            message: "Login Successful", 
            token: SECRET_PASS 
        });
    } else {
        res.json({ success: false, message: "Wrong Password" });
    }
});

// ------------------------------------------------
// B. STUDENT LOGIN & REGISTER SYSTEM (Ye Naya Hai) ✅
// ------------------------------------------------

// 1. Student Register
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "User already exists!" });
        }
        const newUser = new User({ email, password });
        await newUser.save();
        res.json({ success: true, message: "Registration Successful!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 2. Student Login
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
// C. PAGE LOAD ROUTES (Frontend Pages)
// ------------------------------------------------
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});


// ------------------------------------------------
// D. FORM SUBMISSIONS (Public)
// ------------------------------------------------
app.post('/contact', async (req, res) => { try { await new Contact(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/admission', async (req, res) => { try { await new Admission(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/testseries', async (req, res) => { try { await new TestSeries(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/scholarship', async (req, res) => { try { await new Scholarship(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });


// ------------------------------------------------
// E. ADMIN DATA FETCHING (Protected 🔒)
// ------------------------------------------------
const SECRET_PASS = "CareerXone{@2025$RohitJaa";

// Helper function to check auth
const checkAuth = (req, res, next) => {
    const requestPass = req.headers['auth-token'];
    if (requestPass === SECRET_PASS) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// 1. Get Contacts
app.get('/contacts', checkAuth, async (req, res) => {
    res.json(await Contact.find());
});

// 2. Get Admissions
app.get('/admissions', checkAuth, async (req, res) => {
    res.json(await Admission.find());
});

// 3. Get Test Series
app.get('/testseries', checkAuth, async (req, res) => {
    res.json(await TestSeries.find());
});

// 4. Get Scholarships
app.get('/scholarships', checkAuth, async (req, res) => {
    res.json(await Scholarship.find());
});

// 5. Get Registered Users (Ye Naya Hai for Admin) ✅
app.get('/users', checkAuth, async (req, res) => {
    res.json(await User.find());
});


// ------------------------------------------------
// F. DELETE ROUTES (Data Delete karne ke liye)
// ------------------------------------------------
app.delete('/contacts/:id', checkAuth, async (req, res) => {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ status: "Deleted" });
});

app.delete('/admissions/:id', checkAuth, async (req, res) => {
    await Admission.findByIdAndDelete(req.params.id);
    res.json({ status: "Deleted" });
});

app.delete('/testseries/:id', checkAuth, async (req, res) => {
    await TestSeries.findByIdAndDelete(req.params.id);
    res.json({ status: "Deleted" });
});

app.delete('/scholarships/:id', checkAuth, async (req, res) => {
    await Scholarship.findByIdAndDelete(req.params.id);
    res.json({ status: "Deleted" });
});

// ================================================================
// SERVER START
app.listen(PORT, () => {
    console.log(`Server chal gaya! Link: http://localhost:${PORT}/admin-login`);
});