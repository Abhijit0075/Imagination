/*  ============================================================
    auth.js  –  Database-backed Authentication Guard & Client API
    ============================================================
    Protects pages, verifies session with backend database, and
    provides global authentication utilities.
    ============================================================ */

const AUTH_TOKEN_KEY = 'imagination_token';
const AUTH_USER_KEY  = 'imagination_user';

function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function getStoredUser() {
    try {
        const u = localStorage.getItem(AUTH_USER_KEY);
        return u ? JSON.parse(u) : null;
    } catch (_) {
        return null;
    }
}

// Authenticated fetch helper
async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });
    
    // Auto handle 401 Unauthorized
    if (res.status === 401) {
        clearSession();
        window.location.href = 'LogIn.html';
        throw new Error('Session expired. Please log in again.');
    }

    return res;
}

// Sign out helper
function logout() {
    clearSession();
    window.location.href = 'LogIn.html';
}

// Full page blocker message for pending/rejected/error states
function showBlockingMessage(title, message, isPending = false) {
    document.body.innerHTML = `
    <div style="
        min-height:100vh; display:flex; align-items:center; justify-content:center;
        font-family:'Segoe UI',Arial,sans-serif; background:#F8FAFF; padding:30px;
    ">
        <div style="
            max-width:480px; width:100%; text-align:center;
            background:#fff; border:1px solid #E2E8F0; border-radius:20px;
            padding:48px 36px; box-shadow:0 12px 35px rgba(37,99,235,.08);
        ">
            <div style="
                width:68px;height:68px;margin:0 auto 22px;
                display:grid;place-items:center;border-radius:17px;
                background:#EFF6FF;color:#2563EB;font-size:34px;font-weight:700;
            ">∑</div>
            <h2 style="margin-bottom:12px;font-size:26px;color:#172033;letter-spacing:-.5px;">
                ${title}
            </h2>
            <p style="color:#64748B;font-size:15px;line-height:1.8;margin-bottom:28px;">
                ${message}
            </p>
            <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
                ${isPending
                    ? `<button onclick="window.location.reload()" style="
                        padding:12px 24px;border:none;border-radius:9px;
                        background:#2563EB;color:#fff;font-size:14px;font-weight:700;
                        cursor:pointer;box-shadow:0 4px 14px rgba(37,99,235,.25);
                    ">🔄 Re-check Status</button>`
                    : ""
                }
                <button onclick="logout()" style="
                    padding:12px 24px;border:1px solid #CBD5E1;border-radius:9px;
                    background:#fff;color:#526078;font-size:14px;font-weight:700;
                    cursor:pointer;
                ">Sign Out</button>
            </div>
        </div>
    </div>`;
}

// Global Promise resolved on every protected page
const authReady = new Promise(async (resolve) => {
    const token = getToken();

    if (!token) {
        // Not logged in -> send to Login
        window.location.href = 'LogIn.html';
        return;
    }

    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            clearSession();
            window.location.href = 'LogIn.html';
            return;
        }

        const data = await res.json();
        const user = data.user;

        if (!user) {
            clearSession();
            window.location.href = 'LogIn.html';
            return;
        }

        // Check Admin Approval Status
        if (user.status === 'pending') {
            showBlockingMessage(
                "Approval Pending",
                "Your account is awaiting teacher approval. Once your teacher approves your registration, click 'Re-check Status' or log in to access your dashboard.",
                true
            );
            return;
        }

        if (user.status === 'rejected') {
            showBlockingMessage(
                "Access Denied",
                "Your registration has been declined by the administrator. If this is unexpected, please contact your mathematics teacher.",
                false
            );
            return;
        }

        // Cache safe user
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        resolve(user);

    } catch (err) {
        console.error('Auth verification error:', err);
        const cached = getStoredUser();
        if (cached && cached.status === 'approved') {
            resolve(cached);
        } else {
            showBlockingMessage(
                "Connecting to Imagination Server",
                "Please ensure your internet connection is active and refresh the page.",
                true
            );
        }
    }
});
