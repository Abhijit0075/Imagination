/*  ============================================================
    login.js  –  Private Portal Authenticator
    Option 3: Strict Enrolled Student & Teacher Login
    ============================================================ */

const pageMessage     = document.getElementById("pageMessage");
const loginForm       = document.getElementById("loginForm");
const loginEmailInput = document.getElementById("loginEmail");
const rememberMeBox   = document.getElementById("rememberMe");

/* ---------- HELPER: SHOW MESSAGE ---------- */
function showMessage(text, isError = false) {
    pageMessage.textContent = text;
    pageMessage.style.color = isError ? "#DC2626" : "#2563EB";
}

/* ---------- HELPER: BUTTON LOADING STATE ---------- */
function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? "Verifying credentials…" : btn.dataset.originalText;
}

/* ---------- PASSWORD VISIBILITY TOGGLE ---------- */
document.querySelectorAll(".toggle-pwd-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        if (input.type === "password") {
            input.type = "text";
            btn.textContent = "🙈";
            btn.setAttribute("title", "Hide Password");
        } else {
            input.type = "password";
            btn.textContent = "👁️";
            btn.setAttribute("title", "Show Password");
        }
    });
});

/* ---------- REMEMBER ME PRE-FILL ---------- */
const rememberedEmail = localStorage.getItem("imagination_remembered_email");
if (rememberedEmail && loginEmailInput) {
    loginEmailInput.value = rememberedEmail;
    if (rememberMeBox) rememberMeBox.checked = true;
}

/* ---------- CLEAR MESSAGE WHEN TYPING ---------- */
document.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => {
        if (pageMessage.textContent) showMessage("");
    });
});

/* ---------- AUTO-REDIRECT IF ALREADY LOGGED IN ---------- */
(async function checkExistingSession() {
    const token = localStorage.getItem('imagination_token');
    if (!token) return;

    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.user && data.user.status === 'approved') {
                window.location.href = 'Dashboard.html';
            }
        }
    } catch (_) {}
})();

/* ============================================================
   LOGIN SUBMIT HANDLER
   ============================================================ */
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email     = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password  = document.getElementById("loginPassword").value;
    const submitBtn = loginForm.querySelector("button[type=submit]");

    setLoading(submitBtn, true);
    showMessage("");

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || "Login failed. Please check your credentials.", true);
            return;
        }

        // Save email if Remember Me is checked
        if (rememberMeBox && rememberMeBox.checked) {
            localStorage.setItem("imagination_remembered_email", email);
        } else {
            localStorage.removeItem("imagination_remembered_email");
        }

        // Save JWT session
        localStorage.setItem('imagination_token', data.token);
        localStorage.setItem('imagination_user', JSON.stringify(data.user));

        showMessage("Login successful! Redirecting to workspace...", false);

        setTimeout(() => {
            window.location.href = "Dashboard.html";
        }, 250);

    } catch (err) {
        console.error("Login connection error:", err);
        showMessage("Cannot connect to server. Please check your internet connection.", true);
    } finally {
        setLoading(submitBtn, false);
    }
});
