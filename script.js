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

    // 2. Heavy Anti-Bot & Selenium Shield (Googlebot, Google-InspectionTool & Search Engines strictly Allowed)
    const isSearchBot = /google|googlebot|google-inspectiontool|google-site-verification|chrome-lighthouse|bingbot|duckduckbot|slurp|baiduspider|yandexbot|whatsapp|twitterbot|facebookexternalhit/i.test(navigator.userAgent);
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isAutomatedBot = !isSearchBot && !isLocalhost && (
        navigator.webdriver ||
        window.document.documentElement.getAttribute("webdriver") ||
        window.callPhantom ||
        window._phantom ||
        window.__nightmare ||
        ['HeadlessChrome', 'Puppeteer', 'Selenium', 'Playwright'].some(bot => navigator.userAgent.includes(bot))
    );

    if (isAutomatedBot) {
        window.stop(); // Stop all asset loading to save bandwidth
        document.body.innerHTML = "<div style='background:#090d16;color:#f87171;padding:60px 20px;font-family:sans-serif;text-align:center;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;'><h1 style='font-size:2rem;margin-bottom:12px;'>🛡️ Access Denied</h1><p style='color:#94a3b8;'>Automated browsing tools and scrapers (Selenium, Puppeteer) are blocked.</p></div>";
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

// ------------------------------------------------------
// API CONFIGURATION (Vercel Serverless / Same-Origin)
// ------------------------------------------------------
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api';

// ======================================================
// REAL-TIME HUMAN-ONLY ANALYTICS (BOT-FILTERED)
// ======================================================
const cxAnalytics = (() => {
    if (typeof window === 'undefined' || window.__cxAnalyticsInstance) {
        return window.__cxAnalyticsInstance || { track: () => {} };
    }

    const BOT_UA_RE = /google|googlebot|google-inspectiontool|google-site-verification|chrome-lighthouse|bingbot|duckduckbot|slurp|baiduspider|yandexbot|whatsapp|twitterbot|facebookexternalhit|linkedinbot|telegrambot|slackbot|discordbot|headless|phantom|selenium|puppeteer|playwright|webdriver|curl|wget|python|scrapy|crawler|spider|pagespeed|gtmetrix|bot\b/i;

    const ua = navigator.userAgent || '';
    const isAdminPage = /admin/i.test(window.location.pathname || '');
    const hasAutomatedRuntime = Boolean(
        navigator.webdriver ||
        document.documentElement.getAttribute('webdriver') ||
        window.callPhantom ||
        window._phantom ||
        window.__nightmare ||
        BOT_UA_RE.test(ua) ||
        !navigator.languages ||
        navigator.languages.length === 0 ||
        (window.innerWidth === 0 && window.innerHeight === 0)
    );

    const disabled = isAdminPage || hasAutomatedRuntime;

    function getId(storage, key, prefix) {
        try {
            let val = storage.getItem(key);
            if (!val) {
                val = `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
                storage.setItem(key, val);
            }
            return val;
        } catch (_) {
            return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        }
    }

    function detectSource() {
        try {
            if (!document.referrer) return 'Direct';
            const host = new URL(document.referrer).hostname.replace(/^www\./, '').toLowerCase();
            if (!host || host === window.location.hostname.replace(/^www\./, '').toLowerCase()) return 'Internal';
            if (host.includes('google')) return 'Google';
            if (host.includes('instagram')) return 'Instagram';
            if (host.includes('facebook') || host.includes('fb.')) return 'Facebook';
            if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube';
            return host.slice(0, 40);
        } catch (_) {
            return 'Direct';
        }
    }

    const visitorId = getId(window.localStorage, 'cx_vid', 'vis');
    const sessionId = getId(window.sessionStorage, 'cx_sid', 'ses');
    const currentPage = window.location.pathname || '/';
    const sentSessionKeys = new Set();

    let humanVerified = false;
    let pageViewSent = false;
    const visiblePendingForms = new Set();

    function sendPayload(eventType, targetId = '', targetLabel = '', useBeacon = false) {
        if (disabled) return;
        const payload = JSON.stringify({
            eventType,
            visitorId,
            sessionId,
            page: currentPage,
            pageTitle: (document.title || '').slice(0, 120),
            targetId: String(targetId || '').slice(0, 120),
            targetLabel: String(targetLabel || '').slice(0, 120),
            referrer: detectSource(),
            humanSignal: true,
            webdriver: Boolean(navigator.webdriver)
        });

        const url = `${API_BASE}/analytics/event`;
        try {
            if (useBeacon && navigator.sendBeacon) {
                const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
                if (navigator.sendBeacon(url, blob)) return;
            }
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true
            }).catch(() => {});
        } catch (_) {}
    }

    function trackOncePerSession(eventType, targetId = '', targetLabel = '') {
        const key = `${eventType}|${currentPage}|${targetId}`;
        if (sentSessionKeys.has(key)) return;
        try {
            const storeKey = `cx_trk_${key}`;
            if (sessionStorage.getItem(storeKey)) {
                sentSessionKeys.add(key);
                return;
            }
            sessionStorage.setItem(storeKey, '1');
        } catch (_) {}
        sentSessionKeys.add(key);
        sendPayload(eventType, targetId, targetLabel, false);
    }

    function ensureHumanConfirmed() {
        if (disabled || humanVerified) return;
        humanVerified = true;
        if (!pageViewSent) {
            pageViewSent = true;
            trackOncePerSession('page_view', currentPage, document.title || currentPage);
        }
        if (visiblePendingForms.size > 0) {
            visiblePendingForms.forEach((entry) => {
                const [fId, fLabel] = entry.split('||');
                trackOncePerSession('form_section_view', fId, fLabel);
            });
            visiblePendingForms.clear();
        }
    }

    function resolveFormDescriptor(el, idx) {
        const btn = el.querySelector('#contactBtn, #admBtn, #testBtn, #SATBtn, #catBtn, #jobBtn, #loginBtn, #registerBtn, .submit-btn, .ts-submit-btn, button[type="submit"]');
        const heading = el.closest('section, .glass-card, .form-container, .ts-form-box, .scholarship-form-card')?.querySelector('h1, h2, h3, h4');
        const btnId = btn?.id || el.id || el.closest('[id]')?.id || `form-${idx + 1}`;
        const label = (heading?.innerText || btn?.innerText || btnId || 'Enquiry Form').replace(/\s+/g, ' ').trim();
        return { formId: btnId, formLabel: label };
    }

    function setupTracking() {
        if (disabled) return;

        // Require a genuine human gesture before logging visit/form views
        const gestureEvents = ['pointerdown', 'touchstart', 'scroll', 'keydown', 'mousemove'];
        const onGesture = () => {
            ensureHumanConfirmed();
            gestureEvents.forEach(ev => window.removeEventListener(ev, onGesture, { passive: true }));
        };
        gestureEvents.forEach(ev => window.addEventListener(ev, onGesture, { passive: true, once: true }));

        // Observe every <form> section entering the viewport
        const formEls = Array.from(document.querySelectorAll('form'));
        if (formEls.length > 0 && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const idx = formEls.indexOf(entry.target);
                    const { formId, formLabel } = resolveFormDescriptor(entry.target, idx);
                    if (humanVerified) {
                        trackOncePerSession('form_section_view', formId, formLabel);
                    } else {
                        visiblePendingForms.add(`${formId}||${formLabel}`);
                    }
                });
            }, { threshold: 0.25 });
            formEls.forEach(f => observer.observe(f));
        }

        // First focus inside a form confirms form interaction + reach
        document.addEventListener('focusin', (e) => {
            const field = e.target?.closest?.('form input, form select, form textarea');
            if (!field) return;
            ensureHumanConfirmed();
            const fEl = field.closest('form');
            const idx = fEl ? formEls.indexOf(fEl) : 0;
            const { formId, formLabel } = resolveFormDescriptor(fEl || field, Math.max(0, idx));
            trackOncePerSession('form_section_view', formId, formLabel);
            trackOncePerSession('form_focus', formId, formLabel);
        }, true);

        // Capture ALL Call, WhatsApp, and Form Button / CTA Clicks
        document.addEventListener('click', (e) => {
            if (!e.isTrusted) return;
            ensureHumanConfirmed();

            const telLink = e.target?.closest?.('a[href^="tel:"]');
            if (telLink) {
                const rawTel = (telLink.getAttribute('href') || '').replace(/^tel:/i, '').trim();
                const btnText = (telLink.innerText || rawTel).replace(/\s+/g, ' ').trim();
                sendPayload('call_click', rawTel || 'tel', btnText || `Call ${rawTel}`, true);
                return;
            }

            const waLink = e.target?.closest?.('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href^="whatsapp:"], .btn-whatsapp-scholarship');
            if (waLink) {
                const label = (waLink.innerText || 'Chat on WhatsApp').replace(/\s+/g, ' ').trim();
                const href = waLink.getAttribute('href') || 'whatsapp';
                sendPayload('whatsapp_click', href.slice(0, 100), label, true);
                return;
            }

            const formTrigger = e.target?.closest?.('#contactBtn, #admBtn, #testBtn, #SATBtn, #catBtn, #jobBtn, #loginBtn, #registerBtn, button[type="submit"], form .submit-btn, form .ts-submit-btn, .enroll-btn, .apply-role-btn, .btn-scholarship-hero, a[href*="#register"], a[href*="#applySection"], a[href*="admission.html"]');
            if (formTrigger) {
                const id = formTrigger.id || formTrigger.getAttribute('href') || formTrigger.className || 'form-btn';
                const label = (formTrigger.innerText || id).replace(/\s+/g, ' ').trim();
                const isNavLink = formTrigger.tagName === 'A' && !String(formTrigger.getAttribute('href') || '').startsWith('#');
                sendPayload('form_button_click', String(id).slice(0, 80), label, isNavLink);
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupTracking);
    } else {
        setupTracking();
    }

    const apiObj = {
        track: (eventType, targetId = '', targetLabel = '', useBeacon = false) => {
            ensureHumanConfirmed();
            sendPayload(eventType, targetId, targetLabel, useBeacon);
        }
    };
    window.__cxAnalyticsInstance = apiObj;
    return apiObj;
})();

// ======================================================
// PUBLIC LIVE VISITOR COUNTER (INDIAN DIGITS)
// ======================================================
(() => {
    if (typeof window === 'undefined' || window.__cxVisitorCounterStarted) return;
    window.__cxVisitorCounterStarted = true;

    const BOT_UA_RE = /google|googlebot|google-inspectiontool|google-site-verification|chrome-lighthouse|bingbot|duckduckbot|slurp|baiduspider|yandexbot|whatsapp|twitterbot|facebookexternalhit|linkedinbot|telegrambot|slackbot|discordbot|headless|phantom|selenium|puppeteer|playwright|webdriver|curl|wget|python|scrapy|crawler|spider|pagespeed|gtmetrix|bot\b/i;
    const ua = navigator.userAgent || '';
    const isAdminPath = /admin/i.test(window.location.pathname || '');
    const isAutomated = Boolean(
        navigator.webdriver ||
        document.documentElement.getAttribute('webdriver') ||
        window.callPhantom ||
        window._phantom ||
        window.__nightmare ||
        BOT_UA_RE.test(ua) ||
        !navigator.languages ||
        navigator.languages.length === 0 ||
        (window.innerWidth === 0 && window.innerHeight === 0)
    );

    let lastRenderedTotal = null;

    function formatIndianNumber(val) {
        const num = Math.max(0, Math.floor(Number(val) || 0));
        return num.toLocaleString('en-IN');
    }

    function ensureCounterDom() {
        document.querySelectorAll('.copyright-bar').forEach((bar) => {
            if (bar.querySelector('[data-cx-visitor-count]')) return;
            const pill = document.createElement('div');
            pill.className = 'cx-footer-visitor-pill';
            pill.setAttribute('aria-live', 'polite');
            pill.title = 'Live Career Xone Website Visitors';
            pill.innerHTML = '<span class="cx-live-dot" aria-hidden="true"></span><span class="cx-visitor-label">Total Visitors Till Now:</span><strong class="cx-visitor-num" data-cx-visitor-count>19,42,910</strong>';
            const children = Array.from(bar.children);
            if (children.length >= 2) {
                bar.insertBefore(pill, children[1]);
            } else {
                bar.appendChild(pill);
            }
        });
    }

    function renderVisitorCount(total, animateFrom = null) {
        const target = Math.max(0, Math.floor(Number(total) || 0));
        if (!target) return;
        try {
            localStorage.setItem('cx_last_visitor_total', String(target));
        } catch (_) {}
        const nodes = document.querySelectorAll('[data-cx-visitor-count]');
        if (!nodes.length) return;

        if (animateFrom !== null && animateFrom < target && lastRenderedTotal !== target) {
            const startText = formatIndianNumber(animateFrom);
            nodes.forEach((el) => { el.textContent = startText; });
            setTimeout(() => {
                const finalText = formatIndianNumber(target);
                nodes.forEach((el) => {
                    el.textContent = finalText;
                    el.classList.add('cx-visitor-bump');
                    setTimeout(() => el.classList.remove('cx-visitor-bump'), 900);
                });
            }, 350);
        } else {
            const formatted = formatIndianNumber(target);
            nodes.forEach((el) => {
                if (el.textContent !== formatted) {
                    el.textContent = formatted;
                    if (lastRenderedTotal !== null && target > lastRenderedTotal) {
                        el.classList.add('cx-visitor-bump');
                        setTimeout(() => el.classList.remove('cx-visitor-bump'), 900);
                    }
                }
            });
        }
        lastRenderedTotal = target;
    }

    const FALLBACK_PUBLIC_API = 'https://www.cxjeeneet.com/api';

    async function fetchCounterJson(baseUrl, canIncrement, visitorId) {
        const res = await fetch(
            canIncrement ? `${baseUrl}/visitor-counter/hit` : `${baseUrl}/visitor-counter`,
            canIncrement
                ? {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        visitorId,
                        page: window.location.pathname || '/',
                        humanClient: true,
                        webdriver: Boolean(navigator.webdriver)
                    })
                }
                : { method: 'GET' }
        );
        if (!res.ok) throw new Error('Counter HTTP ' + res.status);
        return res.json();
    }

    async function initPublicVisitorCounter() {
        if (isAdminPath) return;
        ensureCounterDom();

        try {
            const cached = Number(localStorage.getItem('cx_last_visitor_total') || 0);
            if (cached > 1942910) renderVisitorCount(cached);
        } catch (_) {}

        let visitorId = '';
        try {
            visitorId = localStorage.getItem('cx_vid') || '';
        } catch (_) {}

        const canIncrement = !isAutomated && document.visibilityState !== 'prerender';

        let activeBase = API_BASE;
        try {
            const data = await fetchCounterJson(activeBase, canIncrement, visitorId);
            if (data && data.success && Number.isFinite(Number(data.totalVisits))) {
                const prev = data.incremented && Number.isFinite(Number(data.previousTotal))
                    ? Number(data.previousTotal)
                    : null;
                renderVisitorCount(data.totalVisits, prev);
            }
        } catch (_) {
            // If previewed via static server (e.g. Live Server :5500) without local :5000 API, fall back read-only to live API
            if (activeBase !== FALLBACK_PUBLIC_API && window.location.protocol !== 'file:') {
                try {
                    const data = await fetchCounterJson(FALLBACK_PUBLIC_API, false, visitorId);
                    if (data && data.success && Number.isFinite(Number(data.totalVisits))) {
                        activeBase = FALLBACK_PUBLIC_API;
                        renderVisitorCount(data.totalVisits);
                    }
                } catch (_) {}
            }
        }

        // Background read-only sync while tab is visible so multi-user traffic updates live
        setInterval(async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const data = await fetchCounterJson(activeBase, false, visitorId);
                if (data && data.success && Number.isFinite(Number(data.totalVisits))) {
                    renderVisitorCount(data.totalVisits);
                }
            } catch (_) {}
        }, 60000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPublicVisitorCounter);
    } else {
        initPublicVisitorCounter();
    }
})();

async function loginRequest(email, password) {
    const res = await fetch(`${API_BASE}/user-login`, {
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

        const email = document.getElementById('regEmail').value.trim();
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

        const originalText = registerBtn.innerText;
        registerBtn.disabled = true;
        registerBtn.innerText = "Registering...";

        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                alert("✅ Account Successfully Created! Ab Login karein.");
                window.location.href = 'login.html'; 
            } else {
                alert("❌ Registration Failed: " + (result.message || "Unknown error"));
            }
        } catch (error) {
            console.error("Register Error:", error);
            alert("⚠️ Server Error. Please try again.");
        } finally {
            registerBtn.disabled = false;
            registerBtn.innerText = originalText;
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

        const name = document.getElementById('contactName').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        const message = document.getElementById('contactMessage').value;

        if (!name || !phone) {
            alert("⚠️ Name and Phone Number are required!");
            return;
        }

        const originalText = contactBtn.innerText;
        contactBtn.disabled = true;
        contactBtn.innerText = "Sending...";

        try {
            const response = await fetch(`${API_BASE}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, message })
            });

            const result = await response.json();
            
            if (result.status === "success") {
                cxAnalytics.track('form_submit_success', 'contactBtn', 'Enquiry Callback Submitted');
                alert("✅ Thank you! Your message has been sent successfully.");
                document.getElementById('contactName').value = '';
                document.getElementById('contactPhone').value = '';
                document.getElementById('contactMessage').value = '';
            } else {
                alert("❌ Failed to send message: " + (result.message || "Please try again."));
            }
        } catch (error) {
            console.error("Contact Error:", error);
            alert("❌ Server connection failed. Please check your connection.");
        } finally {
            contactBtn.disabled = false;
            contactBtn.innerText = originalText;
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

        const name = document.getElementById('admName').value.trim();
        const school = document.getElementById('admSchool').value.trim();
        const course = document.getElementById('admCourse').value;
        const phone = document.getElementById('admPhone').value.trim();
        const email = document.getElementById('admEmail').value.trim();
        const message = document.getElementById('admMessage').value.trim();

        if (!name || !phone || !course) {
            alert("⚠️ Name, Phone and Course are required!");
            return;
        }

        const originalText = admBtn.innerText;
        admBtn.disabled = true;
        admBtn.innerText = "Submitting...";

        try {
            const response = await fetch(`${API_BASE}/admission`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, school, course, phone, email, message })
            });

            const result = await response.json();
            if (result.status === "success") {
                cxAnalytics.track('form_submit_success', 'admBtn', `Admission Submitted (${course})`, true);
                alert("✅ Application Submitted Successfully! We will contact you soon.");
                window.location.reload(); 
            } else {
                alert("❌ Failed: " + (result.message || "Please try again."));
            }
        } catch (error) {
            console.error("Admission Error:", error);
            alert("⚠️ Server Error. Please try again.");
        } finally {
            admBtn.disabled = false;
            admBtn.innerText = originalText;
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

        const name = document.getElementById('testName').value.trim();
        const phone = document.getElementById('testPhone').value.trim();
        const series = document.getElementById('testSeries').value;

        if (!name || !phone || !series) {
            alert("⚠️ Please fill all fields!");
            return;
        }

        const originalText = testBtn.innerText;
        testBtn.disabled = true;
        testBtn.innerText = "Sending...";

        try {
            const response = await fetch(`${API_BASE}/testseries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, series })
            });

            const result = await response.json();
            if (result.status === "success") {
                cxAnalytics.track('form_submit_success', 'testBtn', `Test Series Submitted (${series})`, true);
                alert("✅ Request Sent! We will call you shortly.");
                window.location.reload(); 
            } else {
                alert("❌ Failed: " + (result.message || "Please try again."));
            }
        } catch (error) {
            console.error("Test Series Error:", error);
            alert("⚠️ Server Error. Please try again.");
        } finally {
            testBtn.disabled = false;
            testBtn.innerText = originalText;
        }
    });
}

// ------------------------------------------------------
// 6. SCHOLARSHIP (SAT / CAT) FORM HANDLING
// ------------------------------------------------------
const scholarshipBtn = document.getElementById('SATBtn') || document.getElementById('catBtn');

if (scholarshipBtn) {
    scholarshipBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const nameEl = document.getElementById('SATName') || document.getElementById('catName');
        const phoneEl = document.getElementById('SATPhone') || document.getElementById('catPhone');
        const schoolEl = document.getElementById('SATSchool');
        const classEl = document.getElementById('SATClass') || document.getElementById('catClass');
        const dateEl = document.getElementById('SATDate') || document.getElementById('catDate');
        const customDateEl = document.getElementById('SATCustomInput');

        const name = nameEl ? nameEl.value.trim() : '';
        const phone = phoneEl ? phoneEl.value.trim() : '';
        const school = schoolEl ? schoolEl.value.trim() : '';
        const studentClass = classEl ? classEl.value : '';
        let preferredDate = dateEl ? dateEl.value : '';
        if (preferredDate === 'custom') {
            preferredDate = customDateEl && customDateEl.value.trim() ? customDateEl.value.trim() : 'Custom Date';
        }

        if (!name || !phone || !studentClass) {
            alert("⚠️ Please fill all required fields (Name, Mobile, Class)!");
            return;
        }

        const originalText = scholarshipBtn.innerText;
        scholarshipBtn.disabled = true;
        scholarshipBtn.innerText = "Booking Slot...";

        try {
            const clientRegId = `CX-HS-${Math.floor(1000 + Math.random() * 9000)}`;
            const response = await fetch(`${API_BASE}/scholarship`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regId: clientRegId, name, phone, school, studentClass, preferredDate })
            });

            const result = await response.json();
            if (result.status === "success") {
                cxAnalytics.track('form_submit_success', 'SATBtn', `Scholarship Booked (${studentClass})`);
                const finalRegId = result.regId || clientRegId;
                if (typeof showAdmitCardModal === 'function') {
                    showAdmitCardModal({ regId: finalRegId, name, phone, school, studentClass, preferredDate });
                } else {
                    alert(`✅ Hunar Sangram Slot Booked Successfully!\n\nYour Roll / Registration No: ${finalRegId}`);
                }
                // Clear input fields
                if (nameEl) nameEl.value = '';
                if (phoneEl) phoneEl.value = '';
                if (schoolEl) schoolEl.value = '';
                if (classEl) classEl.selectedIndex = 0;
            } else {
                alert("❌ Failed: " + (result.message || "Please try again."));
            }
        } catch (error) {
            console.error("Scholarship Error:", error);
            alert("⚠️ Server Error. Please try again.");
        } finally {
            scholarshipBtn.disabled = false;
            scholarshipBtn.innerText = originalText;
        }
    });
}

// ------------------------------------------------------
// 6b. CAREERS / JOB APPLICATION FORM HANDLING
// ------------------------------------------------------
const jobBtn = document.getElementById('jobBtn');

if (jobBtn) {
    jobBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const nameEl = document.getElementById('jobName');
        const phoneEl = document.getElementById('jobPhone');
        const emailEl = document.getElementById('jobEmail');
        const positionEl = document.getElementById('jobPosition');
        const expEl = document.getElementById('jobExperience');
        const qualEl = document.getElementById('jobQualification');
        const resumeEl = document.getElementById('jobResume');
        const msgEl = document.getElementById('jobMessage');

        const name = nameEl ? nameEl.value.trim() : '';
        const phone = phoneEl ? phoneEl.value.trim() : '';
        const email = emailEl ? emailEl.value.trim() : '';
        const position = positionEl ? positionEl.value : '';
        const experience = expEl ? expEl.value : '';
        const qualification = qualEl ? qualEl.value.trim() : '';
        const resumeLink = resumeEl ? resumeEl.value.trim() : '';
        const message = msgEl ? msgEl.value.trim() : '';

        if (!name || !phone || !position) {
            alert("⚠️ Please fill in all required fields (Name, Phone Number, and Position Applied For)!");
            return;
        }

        const originalText = jobBtn.innerText;
        jobBtn.disabled = true;
        jobBtn.innerText = "Submitting Application...";

        try {
            const response = await fetch(`${API_BASE}/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, phone, email, position, experience, qualification, resumeLink, message
                })
            });

            const result = await response.json();
            if (result.status === "success") {
                cxAnalytics.track('form_submit_success', 'jobBtn', `Job Application (${position})`);
                alert("🎉 Application Submitted Successfully! Our Academic Operations / HR team will review your profile and contact you soon.");
                if (nameEl) nameEl.value = '';
                if (phoneEl) phoneEl.value = '';
                if (emailEl) emailEl.value = '';
                if (qualEl) qualEl.value = '';
                if (resumeEl) resumeEl.value = '';
                if (msgEl) msgEl.value = '';
            } else {
                alert("❌ Submission Failed: " + (result.message || "Please try again."));
            }
        } catch (error) {
            console.error("Job Application Error:", error);
            alert("⚠️ Server Error. Please check your connection and try again.");
        } finally {
            jobBtn.disabled = false;
            jobBtn.innerText = originalText;
        }
    });
}

// Function to select job role and smooth scroll to form
window.applyForRole = function(roleTitle) {
    const positionSelect = document.getElementById('jobPosition');
    if (positionSelect) {
        for (let i = 0; i < positionSelect.options.length; i++) {
            if (positionSelect.options[i].text.toLowerCase().includes(roleTitle.toLowerCase()) || 
                positionSelect.options[i].value.toLowerCase().includes(roleTitle.toLowerCase())) {
                positionSelect.selectedIndex = i;
                break;
            }
        }
    }
    const applySec = document.getElementById('applySection') || document.getElementById('applyForm');
    if (applySec) {
        applySec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
            const nameEl = document.getElementById('jobName');
            if (nameEl) nameEl.focus();
        }, 600);
    }
};

// ------------------------------------------------------
// 7. AUTHENTICATION UI HANDLE (Login/Logout & Navbar)
// Removed as login button is removed.
// ------------------------------------------------------

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