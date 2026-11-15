/*  ============================================================
    admin.js  –  Private Coaching Admin Panel Logic
    Option 3: Pre-enrollment & Private Account Management
    ============================================================ */

authReady.then(async (currentUser) => {

    /* Only teachers/admins can access this page */
    if (currentUser.role !== "admin") {
        window.location.href = "Dashboard.html";
        return;
    }

    document.getElementById("adminEmail").textContent = currentUser.email;

    /* Logout */
    document.getElementById("logoutBtn").addEventListener("click", () => {
        logout();
    });

    /* Tab switching */
    const tabBtns   = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-content");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
        });
    });

    /* Filter switching */
    const filterBtns = document.querySelectorAll(".filter-btn");
    let currentFilter = "all";

    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderUsers();
        });
    });

    /* ============================================================
       STUDENT MANAGEMENT (Option 3: Pre-enrollment)
       ============================================================ */
    let allUsers = [];

    // Password generator helper
    const btnGen = document.getElementById("btnGenPassword");
    const pwdInput = document.getElementById("newStudentPassword");
    if (btnGen && pwdInput) {
        btnGen.addEventListener("click", () => {
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            pwdInput.value = `Maths@${randomCode}`;
        });
    }

    // Enroll student form handler
    const createForm = document.getElementById("createStudentForm");
    const enrollFeedback = document.getElementById("enrollFeedback");

    createForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name     = document.getElementById("newStudentName").value.trim();
        const email    = document.getElementById("newStudentEmail").value.trim().toLowerCase();
        const password = document.getElementById("newStudentPassword").value.trim();
        const submitBtn = createForm.querySelector("button[type=submit]");

        submitBtn.disabled = true;
        submitBtn.textContent = "Creating student account…";
        enrollFeedback.textContent = "";

        try {
            const res = await authFetch('/api/admin/students', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                enrollFeedback.style.color = "#DC2626";
                enrollFeedback.textContent = data.error || "Failed to create student account.";
                return;
            }

            enrollFeedback.style.color = "#16A34A";
            enrollFeedback.innerHTML = `✓ Student <strong>${escapeHtml(name)}</strong> enrolled successfully! Give them this password: <code>${escapeHtml(password)}</code>`;

            createForm.reset();
            await loadUsers();

        } catch (err) {
            console.error("Error creating student:", err);
            enrollFeedback.style.color = "#DC2626";
            enrollFeedback.textContent = "Server error creating student account.";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "➕ Create & Enroll Student";
        }
    });

    async function loadUsers() {
        try {
            const res = await authFetch('/api/admin/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            allUsers = data.users || [];
            updateCounts();
            renderUsers();
        } catch (err) {
            console.error("Error loading users from database:", err);
            document.getElementById("userList").innerHTML =
                '<div class="empty-state">Could not connect to database. Please check server.</div>';
        }
    }

    function updateCounts() {
        const approved = allUsers.filter(u => u.status === "approved" && u.role === "student").length;
        const rejected = allUsers.filter(u => u.status === "rejected").length;

        document.getElementById("approvedCount").textContent = approved;
        document.getElementById("rejectedCount").textContent = rejected;
        document.getElementById("allCount").textContent      = allUsers.length;
    }

    function renderUsers() {
        const container = document.getElementById("userList");
        const filtered  = currentFilter === "all"
            ? allUsers
            : allUsers.filter(u => u.status === currentFilter);

        if (filtered.length === 0) {
            container.innerHTML =
                `<div class="empty-state">No students found under this filter.</div>`;
            return;
        }

        container.innerHTML = filtered.map(user => {
            const date = user.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric"
                })
                : "—";

            const isActive = user.status === "approved";
            const statusBadge = isActive
                ? `<span class="status-badge status-approved">Active</span>`
                : `<span class="status-badge status-rejected">Suspended</span>`;

            const actions = user.role === "admin"
                ? `<span class="admin-tag">Teacher / Admin</span>`
                : `
                <div class="user-actions">
                    <button class="action-btn reset-pwd-btn" data-id="${user.id}" data-name="${escapeHtml(user.name)}" title="Change password for student">🔑 Reset Password</button>
                    ${isActive
                        ? `<button class="action-btn suspend-btn" data-id="${user.id}" title="Temporarily block access">🚫 Suspend</button>`
                        : `<button class="action-btn approve-btn" data-id="${user.id}" title="Restore access">✓ Activate</button>`
                    }
                    <button class="action-btn delete-btn" data-id="${user.id}" data-name="${escapeHtml(user.name)}" title="Delete student record">🗑️ Delete</button>
                </div>`;

            return `
            <div class="user-card">
                <div class="user-info">
                    <div class="user-avatar">${escapeHtml((user.name || "?")[0].toUpperCase())}</div>
                    <div>
                        <h4>${escapeHtml(user.name || "Unknown")}</h4>
                        <p>${escapeHtml(user.email || "")}</p>
                        <span class="user-date">Enrolled: ${date}</span>
                    </div>
                </div>
                <div class="user-right">
                    ${statusBadge}
                    ${actions}
                </div>
            </div>`;
        }).join("");

        // Attach action handlers
        container.querySelectorAll(".reset-pwd-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const newPwd = prompt(`Enter new password for student "${btn.dataset.name}":`, "Maths@2026");
                if (!newPwd || newPwd.trim().length < 6) {
                    if (newPwd !== null) alert("Password must be at least 6 characters long.");
                    return;
                }

                try {
                    const res = await authFetch(`/api/admin/students/${btn.dataset.id}/reset-password`, {
                        method: 'PATCH',
                        body: JSON.stringify({ newPassword: newPwd.trim() })
                    });
                    if (!res.ok) throw new Error('Password reset failed');
                    alert(`Password for ${btn.dataset.name} updated to: ${newPwd.trim()}`);
                } catch (err) {
                    alert("Failed to reset student password.");
                }
            });
        });

        container.querySelectorAll(".suspend-btn").forEach(btn => {
            btn.addEventListener("click", () => updateUserStatus(btn.dataset.id, "rejected"));
        });

        container.querySelectorAll(".approve-btn").forEach(btn => {
            btn.addEventListener("click", () => updateUserStatus(btn.dataset.id, "approved"));
        });

        container.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (confirm(`Are you sure you want to completely remove ${btn.dataset.name} from the platform?`)) {
                    await authFetch(`/api/admin/users/${btn.dataset.id}`, { method: 'DELETE' });
                    await loadUsers();
                }
            });
        });
    }

    async function updateUserStatus(userId, newStatus) {
        try {
            const res = await authFetch(`/api/admin/users/${userId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error('Status update failed');
            await loadUsers();
        } catch (err) {
            console.error("Error updating user status:", err);
            alert("Failed to update user status.");
        }
    }

    /* Initial load of users */
    loadUsers();

    /* ============================================================
       ANNOUNCEMENTS MANAGEMENT (Links & Important Info for classes)
       ============================================================ */
    const annForm = document.getElementById("announcementForm");

    annForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const title     = document.getElementById("annTitle").value.trim();
        const body      = document.getElementById("annBody").value.trim();
        const link      = document.getElementById("annLink").value.trim();
        const linkLabel = document.getElementById("annLinkLabel").value.trim();
        const submitBtn = annForm.querySelector("button[type=submit]");

        submitBtn.disabled    = true;
        submitBtn.textContent = "Saving to database…";

        try {
            const res = await authFetch('/api/announcements', {
                method: 'POST',
                body: JSON.stringify({ title, body, link, linkLabel })
            });

            if (!res.ok) throw new Error('Failed to save announcement');

            annForm.reset();
            await loadAnnouncements();
        } catch (err) {
            console.error("Error saving announcement:", err);
            alert("Failed to post announcement. Please try again.");
        } finally {
            submitBtn.disabled    = false;
            submitBtn.textContent = "📢 Post to Student Dashboard";
        }
    });

    async function loadAnnouncements() {
        const container = document.getElementById("announcementList");
        try {
            const res = await authFetch('/api/announcements');
            if (!res.ok) throw new Error('Failed to load announcements');
            const data = await res.json();
            const announcements = data.announcements || [];

            if (announcements.length === 0) {
                container.innerHTML = '<div class="empty-state">No announcements in database yet.</div>';
                return;
            }

            container.innerHTML = announcements.map(a => {
                const date = a.createdAt
                    ? new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })
                    : "";

                return `
                <div class="ann-card">
                    <div class="ann-header">
                        <h4>${escapeHtml(a.title)}</h4>
                        <button class="delete-ann" data-id="${a.id}" title="Delete announcement">✕</button>
                    </div>
                    <p class="ann-body">${escapeHtml(a.body)}</p>
                    ${a.link ? `<a href="${escapeHtml(a.link)}" target="_blank" rel="noopener noreferrer" class="ann-link">
                        ${escapeHtml(a.linkLabel || a.link)} ↗
                    </a>` : ""}
                    <div class="ann-meta">
                        <span>By ${escapeHtml(a.postedBy || "Admin")}</span>
                        <span>${date}</span>
                    </div>
                </div>`;
            }).join("");

            container.querySelectorAll(".delete-ann").forEach(btn => {
                btn.addEventListener("click", async () => {
                    if (confirm("Delete this announcement from database?")) {
                        await authFetch(`/api/announcements/${btn.dataset.id}`, { method: 'DELETE' });
                        await loadAnnouncements();
                    }
                });
            });

        } catch (err) {
            console.error("Error fetching announcements:", err);
            container.innerHTML = '<div class="empty-state">Error loading announcements.</div>';
        }
    }

    loadAnnouncements();

    /* ============================================================
       JEE QUESTION BANK MANAGEMENT (Teachers add questions per chapter)
       ============================================================ */
    const qChapterSelect     = document.getElementById("qChapterSelect");
    const filterQuestionChap = document.getElementById("filterQuestionChapter");
    const qTypeSelect        = document.getElementById("qTypeSelect");
    const dynamicOptionsArea = document.getElementById("dynamicOptionsArea");
    const addQuestionForm    = document.getElementById("addQuestionForm");
    const qFormFeedback      = document.getElementById("qFormFeedback");
    const adminQuestionList  = document.getElementById("adminQuestionList");

    let adminChapters = [];

    // 1. Load chapters into dropdowns
    async function initChapterDropdowns() {
        try {
            const res = await authFetch('/api/practice/chapters');
            if (res.ok) {
                const data = await res.json();
                adminChapters = data.chapters || [];

                adminChapters.forEach(ch => {
                    const opt1 = document.createElement("option");
                    opt1.value = ch.id;
                    opt1.textContent = `${ch.name} (${ch.questionCount} Qs)`;
                    qChapterSelect.appendChild(opt1);

                    const opt2 = document.createElement("option");
                    opt2.value = ch.id;
                    opt2.textContent = ch.name;
                    filterQuestionChap.appendChild(opt2);
                });
            }
        } catch (e) {
            console.error('Error loading chapters in admin:', e);
        }
    }

    // 2. Render dynamic options input area
    function renderDynamicOptions(type) {
        if (!dynamicOptionsArea) return;

        if (type === "single") {
            dynamicOptionsArea.innerHTML = `
                <div style="background:#F8FAFC; padding:16px; border-radius:12px; border:1px solid var(--border);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="font-size:13px; font-weight:700; color:var(--text);">Options (4 Options - Select 1 Correct Answer)</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="radio" name="singleCorrectOpt" value="A" checked id="radioA" style="width:18px; height:18px; accent-color:var(--blue); cursor:pointer;">
                            <label for="radioA" style="font-weight:700; width:24px;">A:</label>
                            <input type="text" id="optA" placeholder="Option A text or value" required style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="radio" name="singleCorrectOpt" value="B" id="radioB" style="width:18px; height:18px; accent-color:var(--blue); cursor:pointer;">
                            <label for="radioB" style="font-weight:700; width:24px;">B:</label>
                            <input type="text" id="optB" placeholder="Option B text or value" required style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="radio" name="singleCorrectOpt" value="C" id="radioC" style="width:18px; height:18px; accent-color:var(--blue); cursor:pointer;">
                            <label for="radioC" style="font-weight:700; width:24px;">C:</label>
                            <input type="text" id="optC" placeholder="Option C text or value" required style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="radio" name="singleCorrectOpt" value="D" id="radioD" style="width:18px; height:18px; accent-color:var(--blue); cursor:pointer;">
                            <label for="radioD" style="font-weight:700; width:24px;">D:</label>
                            <input type="text" id="optD" placeholder="Option D text or value" required style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
                        </div>
                    </div>
                </div>
            `;
        } else if (type === "multiple") {
            dynamicOptionsArea.innerHTML = `
                <div style="background:#FAF5FF; padding:16px; border-radius:12px; border:1px solid #E9D5FF;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="font-size:13px; font-weight:700; color:#6B21A8;">Options (Check all that are correct - One or more):</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="checkbox" name="multiCorrectOpt" value="A" id="chkA" style="width:18px; height:18px; accent-color:#7C3AED; cursor:pointer;">
                            <label for="chkA" style="font-weight:700; width:24px;">A:</label>
                            <input type="text" id="optA" placeholder="Option A text or value" required style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="checkbox" name="multiCorrectOpt" value="B" id="chkB" style="width:18px; height:18px; accent-color:#7C3AED; cursor:pointer;">
                            <label for="chkB" style="font-weight:700; width:24px;">B:</label>
                            <input type="text" id="optB" placeholder="Option B text or value" required style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="checkbox" name="multiCorrectOpt" value="C" id="chkC" style="width:18px; height:18px; accent-color:#7C3AED; cursor:pointer;">
                            <label for="chkC" style="font-weight:700; width:24px;">C:</label>
                            <input type="text" id="optC" placeholder="Option C text or value" required style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="checkbox" name="multiCorrectOpt" value="D" id="chkD" style="width:18px; height:18px; accent-color:#7C3AED; cursor:pointer;">
                            <label for="chkD" style="font-weight:700; width:24px;">D:</label>
                            <input type="text" id="optD" placeholder="Option D text or value" required style="flex:1; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
                        </div>
                    </div>
                </div>
            `;
        } else if (type === "numerical") {
            dynamicOptionsArea.innerHTML = `
                <div style="background:#ECFDF5; padding:16px; border-radius:12px; border:1px solid #A7F3D0;">
                    <label for="numCorrectAnswer" style="font-size:13px; font-weight:700; color:#065F46; display:block; margin-bottom:6px;">Correct Numerical Value (Integer or Decimal)</label>
                    <input type="number" step="any" id="numCorrectAnswer" placeholder="e.g. 6 or 0.5" required style="width:100%; max-width:320px; padding:12px; border:1px solid #A7F3D0; border-radius:8px; font-size:16px; font-family:monospace; font-weight:700; color:#065F46;">
                </div>
            `;
        }
    }

    if (qTypeSelect) {
        qTypeSelect.addEventListener("change", (e) => {
            renderDynamicOptions(e.target.value);
        });
        renderDynamicOptions("single"); // default
    }

    // 3. Handle Add Question Form Submit
    if (addQuestionForm) {
        addQuestionForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const chapterId   = qChapterSelect.value;
            const type        = qTypeSelect.value;
            const difficulty  = document.getElementById("qDifficultySelect").value;
            const questionText = document.getElementById("qProblemText").value.trim();
            const explanation = document.getElementById("qExplanation").value.trim();
            const submitBtn   = document.getElementById("btnSaveQuestion");

            if (!chapterId) {
                alert("Please select a JEE Chapter.");
                return;
            }

            let options = [];
            let correctAnswer = null;

            if (type === "single") {
                const optA = document.getElementById("optA").value.trim();
                const optB = document.getElementById("optB").value.trim();
                const optC = document.getElementById("optC").value.trim();
                const optD = document.getElementById("optD").value.trim();
                options = [
                    { id: "A", text: optA },
                    { id: "B", text: optB },
                    { id: "C", text: optC },
                    { id: "D", text: optD }
                ];
                const checkedRadio = document.querySelector('input[name="singleCorrectOpt"]:checked');
                correctAnswer = checkedRadio ? checkedRadio.value : "A";

            } else if (type === "multiple") {
                const optA = document.getElementById("optA").value.trim();
                const optB = document.getElementById("optB").value.trim();
                const optC = document.getElementById("optC").value.trim();
                const optD = document.getElementById("optD").value.trim();
                options = [
                    { id: "A", text: optA },
                    { id: "B", text: optB },
                    { id: "C", text: optC },
                    { id: "D", text: optD }
                ];
                const checkedBoxes = Array.from(document.querySelectorAll('input[name="multiCorrectOpt"]:checked')).map(cb => cb.value);
                if (checkedBoxes.length === 0) {
                    alert("Please check at least one correct option for Multiple Choice.");
                    return;
                }
                correctAnswer = checkedBoxes;

            } else if (type === "numerical") {
                const numAns = document.getElementById("numCorrectAnswer").value.trim();
                if (!numAns) {
                    alert("Please enter the correct numerical value.");
                    return;
                }
                correctAnswer = numAns;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Saving question…";
            qFormFeedback.textContent = "";

            try {
                const res = await authFetch('/api/admin/questions', {
                    method: 'POST',
                    body: JSON.stringify({
                        chapterId,
                        type,
                        questionText,
                        options,
                        correctAnswer,
                        explanation,
                        difficulty
                    })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to save question');

                qFormFeedback.style.color = "#16A34A";
                qFormFeedback.textContent = "✓ Question added successfully to chapter!";

                document.getElementById("qProblemText").value = "";
                document.getElementById("qExplanation").value = "";
                renderDynamicOptions(type); // reset options inputs

                await loadAdminQuestions(filterQuestionChap.value);

            } catch (err) {
                console.error('Error saving question:', err);
                qFormFeedback.style.color = "#DC2626";
                qFormFeedback.textContent = err.message || "Failed to add question.";
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "➕ Save Question to Chapter";
            }
        });
    }

    // 4. Load Admin Question Bank
    async function loadAdminQuestions(chapterFilter = "") {
        if (!adminQuestionList) return;
        adminQuestionList.innerHTML = '<div class="loading-state">Loading questions…</div>';

        try {
            const url = chapterFilter ? `/api/admin/questions?chapter=${encodeURIComponent(chapterFilter)}` : '/api/admin/questions';
            const res = await authFetch(url);
            if (!res.ok) throw new Error('Failed to fetch questions');
            const data = await res.json();
            const questions = data.questions || [];

            if (questions.length === 0) {
                adminQuestionList.innerHTML = '<div class="empty-state">No questions found in this chapter. Add your first question above!</div>';
                return;
            }

            adminQuestionList.innerHTML = questions.map((q, idx) => {
                let ansStr = "";
                if (Array.isArray(q.correctAnswer)) {
                    ansStr = q.correctAnswer.join(", ");
                } else {
                    ansStr = String(q.correctAnswer);
                }

                return `
                <div class="ann-card" style="margin-bottom:18px;">
                    <div class="ann-header">
                        <div>
                            <span class="chapter-cat-badge" style="margin-right:6px;">${escapeHtml(q.chapterName)}</span>
                            <span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px; background:#F1F5F9; color:#475569;">${escapeHtml(q.difficulty || "JEE Main")}</span>
                            <span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px; background:#EFF6FF; color:#1D4ED8; margin-left:6px;">${escapeHtml(q.type.toUpperCase())}</span>
                        </div>
                        <button class="delete-q-btn" data-id="${q.id}" style="border:none; background:#FEE2E2; color:#DC2626; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;">✕ Delete</button>
                    </div>

                    <p style="font-size:15px; font-weight:600; color:#1E293B; margin:12px 0; line-height:1.6; white-space:pre-wrap;">${escapeHtml(q.questionText)}</p>

                    ${q.options && q.options.length > 0 ? `
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px; margin-bottom:12px;">
                            ${q.options.map(opt => {
                                const isCorrectOpt = Array.isArray(q.correctAnswer)
                                    ? q.correctAnswer.includes(opt.id)
                                    : String(q.correctAnswer).toUpperCase() === opt.id;

                                return `
                                <div style="padding:8px 12px; border-radius:8px; border:1px solid ${isCorrectOpt ? '#10B981' : '#E2E8F0'}; background:${isCorrectOpt ? '#ECFDF5' : '#F8FAFC'}; font-size:13px; color:${isCorrectOpt ? '#065F46' : '#334155'}; font-weight:${isCorrectOpt ? '700' : '500'};">
                                    <strong>${opt.id}:</strong> ${escapeHtml(opt.text)} ${isCorrectOpt ? '✓' : ''}
                                </div>`;
                            }).join("")}
                        </div>
                    ` : ''}

                    <div style="font-size:13px; font-weight:700; color:#065F46; margin-bottom:8px;">
                        Correct Answer: ${escapeHtml(ansStr)}
                    </div>

                    <div style="font-size:12px; color:#475569; background:#F8FAFC; padding:10px 14px; border-radius:8px; border:1px solid #E2E8F0; line-height:1.6; white-space:pre-wrap;">
                        <strong>Solution:</strong> ${escapeHtml(q.explanation || "No explanation.")}
                    </div>
                </div>`;
            }).join("");

            // Delete question handler
            adminQuestionList.querySelectorAll(".delete-q-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    if (confirm("Are you sure you want to delete this question?")) {
                        try {
                            const res = await authFetch(`/api/admin/questions/${btn.dataset.id}`, { method: 'DELETE' });
                            if (res.ok) {
                                await loadAdminQuestions(filterQuestionChap.value);
                            }
                        } catch (e) {
                            alert("Failed to delete question.");
                        }
                    }
                });
            });

        } catch (err) {
            console.error('Error loading questions:', err);
            adminQuestionList.innerHTML = '<div class="empty-state">Error loading question bank.</div>';
        }
    }

    if (filterQuestionChap) {
        filterQuestionChap.addEventListener("change", (e) => {
            loadAdminQuestions(e.target.value);
        });
    }

    initChapterDropdowns();
    loadAdminQuestions();
});

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
