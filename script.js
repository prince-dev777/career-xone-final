// ======================================================
//   CAREER XONE - FRONTEND LOGIC
// ======================================================


// DOMContentLoaded ke andar daalne se ye error nahi dega
document.addEventListener("DOMContentLoaded", function() {

    // 1. Sabhi images ko lazy load aur async karne ke liye
    document.querySelectorAll('img').forEach(img => {
        img.setAttribute('loading', 'lazy'); // Bandwidth bachayega
        img.setAttribute('decoding', 'async'); // Page load speed badhayega
    });

    // 2. Basic Bot Blocking (Vercel ke bharose nahi rehna padega)
    const forbiddenBots = ['HeadlessChrome', 'Puppeteer', 'Bot', 'Crawler', 'Lighthouse'];
    const userAgent = navigator.userAgent;

    if (forbiddenBots.some(bot => userAgent.includes(bot))) {
        window.stop(); // Bot ki activity turant rok dega
        document.body.innerHTML = "<h1 style='text-align:center; margin-top:50px;'>Access Denied for Bots</h1>";
    }
});












// ------------------------------------------------------
// 1. LOGIN FORM HANDLING
// ------------------------------------------------------
const form = document.getElementById('loginForm');

if (form) {
    form.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!validateInputs(email, password)) return;

    toggleLoading(true);

    try {
        const data = await loginRequest(email, password);

        handleSuccess(data);

    } catch (error) {
        handleError(error);
    } finally {
        toggleLoading(false);
    }
}

// ------------------ FUNCTIONS ------------------

function validateInputs(email, password) {
    if (!email || !password) {
        showMessage("All fields required", "error");
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage("Invalid email", "error");
        return false;
    }

    return true;
}

async function loginRequest(email, password) {

    const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000' : 'https://career-xone-final.onrender.com'
    const res = await fetch(`${API_URL}/user-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
        throw new Error("HTTP Error");
    }

    return res.json();
}

function handleSuccess(data) {
    if (data.success) {
        localStorage.setItem("token", data.token);
        showMessage("Login Success 🎉", "success");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    } else {
        showMessage(data.message, "error");
    }
}

function handleError(error) {
    console.error(error);
    showMessage("Server error. Try again.", "error");
}

function toggleLoading(isLoading) {
    const btn = document.getElementById('loginBtn');

    btn.disabled = isLoading;
    btn.innerText = isLoading ? "Logging in..." : "Login";
}

function showMessage(msg, type) {
    const box = document.getElementById("messageBox");

    if (box) {
        box.innerText = msg;
        box.className = type;
    } else {
        alert(msg);
    }
}






// ------------------------------------------------------
// 2. REGISTRATION FORM HANDLING 
// ------------------------------------------------------
const registerBtn = document.getElementById('registerBtn');

if (registerBtn) {
    registerBtn.addEventListener('click', async (e) => {
        e.preventDefault(); 

        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (!email || !password || !confirmPassword) {
            alert("⚠️ Please fill all fields!");
            return;
        }

        if (password !== confirmPassword) {
            alert("❌ Passwords match nahi kar rahe hain!");
            return;
        }

        try {
            const response = await fetch('https://career-xone-final.onrender.com/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                alert("✅ Account Successfully Created! Ab Login karein.");
                window.location.href = 'login.html'; 
            } else {
                alert("❌ Registration Failed: " + result.message);
            }
        } catch (error) {
            console.error("Register Error:", error);
            alert("⚠️ Server Error. Please try again.");
        }
    });
}

// ------------------------------------------------------
// 3. CONTACT / INQUIRY FORM HANDLING
// ------------------------------------------------------
const contactBtn = document.getElementById('contactBtn');

if (contactBtn) {
    contactBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const name = document.getElementById('contactName').value;
        const phone = document.getElementById('contactPhone').value;
        const message = document.getElementById('contactMessage').value;

        if (!name || !phone) {
            alert("⚠️ Name and Phone Number are required!");
            return;
        }

        try {
            const response = await fetch('https://career-xone-final.onrender.com/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, message })
            });

            const result = await response.json();
            
            if (result.status === "success") {
                alert("✅ Thank you! Your message has been sent successfully.");
                document.getElementById('contactName').value = '';
                document.getElementById('contactPhone').value = '';
                document.getElementById('contactMessage').value = '';
            } else {
                 alert("❌ Failed to send message.");
            }
        } catch (error) {
            console.error("Contact Error:", error);
            alert("❌ Server connection failed. Please check your connection.");
        }
    });
}

// ------------------------------------------------------
// 4. ADMISSION FORM HANDLING
// ------------------------------------------------------
const admBtn = document.getElementById('admBtn');

if (admBtn) {
    admBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const name = document.getElementById('admName').value;
        const school = document.getElementById('admSchool').value;
        const course = document.getElementById('admCourse').value;
        const phone = document.getElementById('admPhone').value;
        const email = document.getElementById('admEmail').value;
        const message = document.getElementById('admMessage').value;

        if (!name || !phone || !course) {
            alert("⚠️ Name, Phone and Course are required!");
            return;
        }

        try {
            const response = await fetch('https://career-xone-final.onrender.com/admission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, school, course, phone, email, message })
            });

            const result = await response.json();
            if (result.status === "success") {
                alert("✅ Application Submitted Successfully!");
                window.location.reload(); 
            } else {
                alert("❌ Failed: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("⚠️ Server Error");
        }
    });
}

// ------------------------------------------------------
// 5. TEST SERIES FORM HANDLING
// ------------------------------------------------------
const testBtn = document.getElementById('testBtn');

if (testBtn) {
    testBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const name = document.getElementById('testName').value;
        const phone = document.getElementById('testPhone').value;
        const series = document.getElementById('testSeries').value;

        if (!name || !phone || !series) {
            alert("⚠️ Please fill all fields!");
            return;
        }

        try {
            const response = await fetch('https://career-xone-final.onrender.com/testseries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, series })
            });

            const result = await response.json();
            if (result.status === "success") {
                alert("✅ Request Sent! We will call you shortly.");
                window.location.reload(); 
            } else {
                alert("❌ Failed: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("⚠️ Server Error");
        }
    });
}

// ------------------------------------------------------
// 6. SCHOLARSHIP (CAT) FORM HANDLING
// ------------------------------------------------------
const catBtn = document.getElementById('catBtn');

if (catBtn) {
    catBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const name = document.getElementById('catName').value;
        const phone = document.getElementById('catPhone').value;
        const studentClass = document.getElementById('catClass').value;
        const preferredDate = document.getElementById('catDate').value;

        if (!name || !phone || !studentClass) {
            alert("⚠️ Please fill all required fields!");
            return;
        }

        try {
            const response = await fetch('https://career-xone-final.onrender.com/scholarship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, studentClass, preferredDate })
            });

            const result = await response.json();
            if (result.status === "success") {
                alert("✅ CAT Slot Booked Successfully!");
                window.location.reload(); 
            } else {
                alert("❌ Failed: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("⚠️ Server Error");
        }
    });
}

// ------------------------------------------------------
// 7. AUTHENTICATION UI HANDLE (Login/Logout & Navbar)
// ------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const authBtn = document.getElementById("authBtn");
    const userEmail = localStorage.getItem("userEmail"); // ✅ Sahi variable use kiya

    if (userEmail && authBtn) {
        let userName = userEmail.split('@')[0];
        if (userName.length > 12) userName = userName.substring(0, 10) + "..";

        authBtn.classList.add("logout-mode");
        authBtn.href = "#";

        authBtn.innerHTML = `
            <span class="user-text"><i class="fas fa-user-circle"></i> ${userName}</span>
            <span class="logout-text"><i class="fas fa-sign-out-alt"></i> Logout</span>
        `;

        authBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to Logout?")) {
                localStorage.removeItem("userEmail"); // ✅ Memory clear
                window.location.reload();
            }
        });
    }
});

// ------------------------------------------------------
// 8. MOBILE MENU TOGGLE 📱
// ------------------------------------------------------
const mobileBtn = document.getElementById('mobileBtn');
const navLinks  = document.querySelector('.nav-links');
const dropbtns  = document.querySelectorAll('.dropbtn');

if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileBtn.classList.toggle('active');
        navLinks.classList.toggle('active');

        if (!navLinks.classList.contains('active')) {
            closeAllDropdowns();
        }
    });
}

dropbtns.forEach(btn => {
    btn.addEventListener('click', function (e) {
        if (window.innerWidth > 1024) return;

        e.preventDefault();
        e.stopPropagation();

        const dropdown = this.closest('.dropdown');
        const content  = dropdown.querySelector('.dropdown-content');
        const isOpen = content.classList.contains('show');

        if (isOpen) {
            content.classList.remove('show');
            this.classList.remove('active');
            return;
        }

        closeAllDropdowns();
        content.classList.add('show');
        this.classList.add('active');
    });
});

document.addEventListener('click', (e) => {
    if (
        navLinks && navLinks.classList.contains('active') &&
        !navLinks.contains(e.target) &&
        !mobileBtn.contains(e.target)
    ) {
        navLinks.classList.remove('active');
        mobileBtn.classList.remove('active');
        closeAllDropdowns();
    }
});

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-content.show')
        .forEach(el => el.classList.remove('show'));

    document.querySelectorAll('.dropbtn.active')
        .forEach(el => el.classList.remove('active'));
}




// ------------------------------------------------------
// 9. Google tag
// ------------------------------------------------------
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-10783730743');