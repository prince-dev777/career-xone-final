const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// ✅ STATIC FILES FIX (Sabse Zaroori)
// Ye line tumhare folder ki HTML, CSS, Images ko sahi se serve karegi
app.use(express.static(__dirname));

// --- DATABASE CONNECTION ---
const DB_URI = "mongodb+srv://botxone5_db_user:zsZowDgeuRg5nWy5@cluster0.l60r7uk.mongodb.net/careerXoneDB?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(DB_URI)
    .then(() => console.log('✅ MongoDB Cloud Connected! (Database Ready)'))
    .catch((err) => console.error('❌ MongoDB Error:', err));
// ================================================================
// 📝 SCHEMAS (Forms ka Data Design)
// ================================================================
const ContactSchema = new mongoose.Schema({ name: String, phone: String, message: String, date: { type: Date, default: Date.now } });
const Contact = mongoose.model('Contact', ContactSchema);

const AdmissionSchema = new mongoose.Schema({ name: String, school: String, course: String, phone: String, email: String, message: String, date: { type: Date, default: Date.now } });
const Admission = mongoose.model('Admission', AdmissionSchema);

const TestSeriesSchema = new mongoose.Schema({ name: String, phone: String, series: String, date: { type: Date, default: Date.now } });
const TestSeries = mongoose.model('TestSeries', TestSeriesSchema);

const ScholarshipSchema = new mongoose.Schema({ name: String, phone: String, studentClass: String, preferredDate: String, date: { type: Date, default: Date.now } });
const Scholarship = mongoose.model('Scholarship', ScholarshipSchema);

// ================================================================
// 🛣️ ROUTES (Raaste)
// ================================================================

// 1. 🔒 ADMIN LOGIN CHECK (Password Checker)
app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    const SECRET_PASS = "admin123"; // Password sirf yahan rahega (Safe)

    if (password === SECRET_PASS) {
        // ✅ Change: Ab hum message ke saath TOKEN bhi bhej rahe hain
        res.json({ 
            success: true, 
            message: "Login Successful", 
            token: SECRET_PASS // <--- Server ne diya token
        });
    } else {
        res.json({ success: false, message: "Wrong Password" });
    }
});

// 2. PAGE LOAD ROUTES (Browser ke liye)
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- FORM SUBMISSION ROUTES (Tumhare Forms ke liye) ---
app.post('/contact', async (req, res) => { try { await new Contact(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/admission', async (req, res) => { try { await new Admission(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/testseries', async (req, res) => { try { await new TestSeries(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });
app.post('/scholarship', async (req, res) => { try { await new Scholarship(req.body).save(); res.json({ status: "success" }); } catch (e) { res.status(500).json({ status: "error" }); } });

// --- ADMIN DATA FETCHING ---
// --- 🔒 PROTECTED DATA ROUTES (Ab ye Password mangenge) ---

const SECRET_PASS = "admin123"; // 🔑 Ye wahi password hai jo Login me use kiya

// 1. Contacts Data
app.get('/contacts', async (req, res) => {
    const requestPass = req.headers['auth-token'];
    if (requestPass === SECRET_PASS) {
        res.json(await Contact.find());
    } else {
        res.status(401).json({ error: "Unauthorized: Bhag yahan se!" });
    }
});

// 2. Admissions Data
app.get('/admissions', async (req, res) => {
    const requestPass = req.headers['auth-token'];
    if (requestPass === SECRET_PASS) {
        res.json(await Admission.find());
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// 3. Test Series Data
app.get('/testseries', async (req, res) => {
    const requestPass = req.headers['auth-token'];
    if (requestPass === SECRET_PASS) {
        res.json(await TestSeries.find());
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// 4. Scholarship Data
app.get('/scholarships', async (req, res) => {
    const requestPass = req.headers['auth-token'];
    if (requestPass === SECRET_PASS) {
        res.json(await Scholarship.find());
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});


// ================================================================
// 🗑️ DELETE ROUTES (Data hatane ke liye)
// ================================================================

// 1. Delete Contact
app.delete('/contacts/:id', async (req, res) => {
    const { id } = req.params;
    const requestPass = req.headers['auth-token'];
    if (requestPass === "admin123") {
        await Contact.findByIdAndDelete(id); // Database se gayab
        res.json({ status: "Deleted" });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// 2. Delete Admission
app.delete('/admissions/:id', async (req, res) => {
    const { id } = req.params;
    const requestPass = req.headers['auth-token'];
    if (requestPass === "admin123") {
        await Admission.findByIdAndDelete(id);
        res.json({ status: "Deleted" });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// 3. Delete Test Series
app.delete('/testseries/:id', async (req, res) => {
    const { id } = req.params;
    const requestPass = req.headers['auth-token'];
    if (requestPass === "admin123") {
        await TestSeries.findByIdAndDelete(id);
        res.json({ status: "Deleted" });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// 4. Delete Scholarship
app.delete('/scholarships/:id', async (req, res) => {
    const { id } = req.params;
    const requestPass = req.headers['auth-token'];
    if (requestPass === "admin123") {
        await Scholarship.findByIdAndDelete(id);
        res.json({ status: "Deleted" });
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

// ================================================================
// SERVER START
app.listen(PORT, () => {
    console.log(`Server chal gaya! Link: http://localhost:${PORT}/admin-login`);
});