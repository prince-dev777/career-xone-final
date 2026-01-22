// ======================================================
//  CAREER XONE - FRONTEND LOGIC
// ======================================================

// ------------------------------------------------------
// 1. LOGIN FORM HANDLING (UPDATED)
// ------------------------------------------------------
    const loginBtn = document.getElementById('loginBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Page reload roko

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                alert("Please fill all fields");
                return;
            }

            try {
             // 👇 YAHAN CHANGE KIYA HAI (Render ka Live Link dala hai)
            const response = await fetch('https://career-xone-final.onrender.com/user-login', {
             method: 'POST',
         headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ email, password })
            });

                const result = await response.json();

                if (result.success) {
                    localStorage.setItem("userEmail", email);
                    alert("Login Successful! 🎉");
                    window.location.href = "index.html"; // Ya dashboard.html jahan bhejna ho
                } else {
                    alert("❌ Error: " + result.message);
                }
            } catch (error) {
                console.error("Error:", error);
                alert("Server connection failed! Make sure backend is running on port 5000.");
            }
        });
    }

// ------------------------------------------------------
// 2. CONTACT / INQUIRY FORM HANDLING
// ------------------------------------------------------
const contactBtn = document.getElementById('contactBtn');

if (contactBtn) {
    contactBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // Get Values
        const name = document.getElementById('contactName').value;
        const phone = document.getElementById('contactPhone').value;
        const message = document.getElementById('contactMessage').value;

        // VALIDATION
        if (!name || !phone) {
            alert("⚠️ Name and Phone Number are required!");
            return;
        }

        try {
            // Send Data to Server
            const response = await fetch('https://career-xone-final.onrender.com/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, message })
            });

            const result = await response.json();
            console.log("Server Response:", result);
            
            alert("✅ Thank you! Your message has been sent successfully.");

            // Clear Form Fields
            document.getElementById('contactName').value = '';
            document.getElementById('contactPhone').value = '';
            document.getElementById('contactMessage').value = '';

        } catch (error) {
            console.error("Contact Error:", error);
            alert("❌ Failed to send message. Please check your connection.");
        }
    });
}


// ------------------------------------------------------
// 3. CHECK LOGIN STATUS (UI UPDATE)
// ------------------------------------------------------
function updateNavbar() {
    // Check karein ki memory me user hai ya nahi
    const user = localStorage.getItem('loggedInUser');
    
    // Aapke Navbar me jo Login button hai (class="login-btn")
    const navLoginBtn = document.querySelector('.login-btn'); 

    if (user && navLoginBtn) {
        // Agar user login hai, toh button ko change karein
        navLoginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        navLoginBtn.href = "#"; // Link hata dein taaki click hone par page na bhage
        
        // Logout ka logic
        navLoginBtn.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser'); // Memory saaf karein
            alert("Logged Out Successfully!");
            window.location.href = 'login.html'; // Wapas login page par bhej dein
        });
    }
}

// Jaise hi page load ho, ye function chale
document.addEventListener('DOMContentLoaded', updateNavbar);

// ======================================================
// 4. REGISTRATION FORM HANDLING (New)
// ======================================================
const registerBtn = document.getElementById('registerBtn');

if (registerBtn) {
    registerBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // Page refresh rokein

        // Values lein
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        // Basic Checks
        if (!email || !password || !confirmPassword) {
            alert("⚠️ Please fill all fields!");
            return;
        }

        if (password !== confirmPassword) {
            alert("❌ Passwords match nahi kar rahe hain!");
            return;
        }

        try {
            // Server ko data bhejein (/register route par)
            const response = await fetch('https://career-xone-final.onrender.com/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.status === "success") {
                alert("✅ Account Successfully Created! Ab Login karein.");
                window.location.href = 'login.html'; // Login page par bhej dein
            } else {
                alert("❌ Registration Failed: " + result.message);
            }

        } catch (error) {
            console.error("Register Error:", error);
            alert("⚠️ Server Error. Please try again.");
        }
    });
}



// ============================================================================================================================================
// admission form ------------------------------


// ======================================================
// 5. ADMISSION FORM HANDLING (New)
// ======================================================
const admBtn = document.getElementById('admBtn');

if (admBtn) {
    admBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // Data ikhatta karein
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
                window.location.reload(); // Form reset karne ke liye reload
            } else {
                alert("❌ Failed: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("⚠️ Server Error");
        }
    });
}
// ====================================================================================================================================================

// ======================================================
// 6. TEST SERIES FORM HANDLING (New)
// ======================================================
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


// ======================================================
// 7. SCHOLARSHIP (CAT) FORM HANDLING (New)
// ======================================================
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









// ======================================================
// 8. MOBILE MENU TOGGLE (Final) 📱
// ======================================================
// DOM Elements Uthana
const mobileBtn = document.getElementById('mobileBtn');
const navLinks = document.querySelector('.nav-links');

// 1. Toggle Menu (Khulna / Band hona)
mobileBtn.addEventListener('click', () => {
    mobileBtn.classList.toggle('active'); // Button Animation
    navLinks.classList.toggle('active');  // Sidebar Slide
});

// 2. Dropdown Logic (Sirf Mobile ke liye)
const dropbtns = document.querySelectorAll('.dropbtn');

dropbtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
        // Agar screen choti hai (Mobile/Tablet)
        if (window.innerWidth <= 1024) {
            e.preventDefault(); // Page reload rokega (Most Important)
            
            // Jispe click kiya, uska next element (.dropdown-content) dhundo
            const content = this.nextElementSibling;
            
            // Dropdown Show/Hide toggle karo
            content.classList.toggle('show');
            
            // Arrow icon ko ghumao
            this.classList.toggle('active');
        }
    });
});

// 3. Screen ke bahar click karne par menu band (Optional Premium Feature)
document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !mobileBtn.contains(e.target) && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        mobileBtn.classList.remove('active');
    }
});




// ==========================================
// 🔐 AUTHENTICATION UI HANDLE (Login/Logout)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const authBtn = document.getElementById("authBtn");
    const userEmail = localStorage.getItem("userEmail");

    if (userEmail && authBtn) {
        let userName = userEmail.split('@')[0];
        // Naam agar bada ho toh trim karo
        if (userName.length > 12) userName = userName.substring(0, 10) + "..";

        authBtn.classList.add("logout-mode");
        authBtn.href = "#";

        // 👇 YAHAN CHANGE HAI (Classes match karayi hain CSS se)
        authBtn.innerHTML = `
            <span class="user-text"><i class="fas fa-user-circle"></i> ${userName}</span>
            <span class="logout-text"><i class="fas fa-sign-out-alt"></i> Logout</span>
        `;

        authBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to Logout?")) {
                localStorage.removeItem("userEmail");
                window.location.reload();
            }
        });
    }
});