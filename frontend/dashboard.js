/*  ============================================================
    dashboard.js  –  Dashboard connected to database & REST API
    ============================================================ */

/* ---------- Sidebar toggle ---------- */
const menuBtn  = document.getElementById("menuBtn");
const sidebar  = document.getElementById("sidebar");
const overlay  = document.getElementById("overlay");
const closeBtn = document.getElementById("closeBtn");

function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
    menuBtn.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    menuBtn.setAttribute("aria-expanded", "false");
}

menuBtn.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

closeBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
});

/* ---------- Sidebar navigation between pages ---------- */
const navItems = document.querySelectorAll(".nav-item[data-page]");
const pages    = document.querySelectorAll(".page");

function showPage(pageId) {
    const target = document.getElementById(pageId);
    if (!target) return;

    pages.forEach(page => page.classList.toggle("active", page.id === pageId));

    navItems.forEach(item => {
        item.classList.toggle("active", item.dataset.page === pageId);
    });

    history.replaceState(null, "", `#${pageId}`);
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

navItems.forEach(item => {
    item.addEventListener("click", event => {
        event.preventDefault();
        showPage(item.dataset.page);
    });
});

/* Open the correct page when using a page hash */
function loadPageFromHash() {
    const pageId = location.hash.slice(1);
    if (pageId && document.getElementById(pageId)?.classList.contains("page")) {
        showPage(pageId);
    }
}

window.addEventListener("hashchange", loadPageFromHash);
loadPageFromHash();

/* ============================================================
   AUTH-AWARE & DATABASE INTEGRATION
   ============================================================ */

authReady.then(async (currentUser) => {

    /* ---------- Navbar info & logout ---------- */
    const greeting = document.getElementById("userGreeting");
    const logoutBtn = document.getElementById("navLogoutBtn");

    if (greeting) {
        greeting.textContent = currentUser.name
            ? `Hi, ${currentUser.name}`
            : currentUser.email;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            logout();
        });
    }

    /* ---------- Teacher / Admin privileges ---------- */
    if (currentUser.role === "admin") {
        const topAdmin = document.getElementById("topAdminBtn");
        if (topAdmin) topAdmin.style.display = "inline-flex";

        const adminLink = document.getElementById("adminNavLink");
        if (adminLink) adminLink.style.display = "";

        const adminActions = document.getElementById("adminQuickActions");
        if (adminActions) adminActions.style.display = "";
    }

    /* ---------- Load Announcements & Class Links from Database ---------- */
    async function loadDashboardAnnouncements() {
        const container = document.getElementById("dashboardAnnouncements");
        if (!container) return;

        try {
            const res = await authFetch('/api/announcements');
            if (!res.ok) throw new Error('Failed to fetch announcements');
            const data = await res.json();
            const announcements = data.announcements || [];

            if (announcements.length === 0) {
                container.innerHTML = `
                    <div class="empty-announcements">
                        <div class="empty-ann-icon">📢</div>
                        <h3>No announcements yet</h3>
                        <p>Your teachers haven't posted any updates or links yet. Check back soon!</p>
                    </div>`;
                return;
            }

            container.innerHTML = announcements.map(a => {
                const date = a.createdAt
                    ? new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                    })
                    : "";

                return `
                <div class="dashboard-ann-card">
                    <div class="dash-ann-top">
                        <h3>${escapeHtml(a.title)}</h3>
                        <span class="dash-ann-date">${date}</span>
                    </div>
                    <p class="dash-ann-body">${escapeHtml(a.body)}</p>
                    ${a.link ? `
                    <a href="${escapeHtml(a.link)}" target="_blank" rel="noopener noreferrer" class="dash-ann-link">
                        ${escapeHtml(a.linkLabel || "Open Class Link")} ↗
                    </a>` : ""}
                    <span class="dash-ann-author">— ${escapeHtml(a.postedBy || "Teacher")}</span>
                </div>`;
            }).join("");

        } catch (err) {
            console.error("Error loading announcements:", err);
            container.innerHTML = `
                <div class="empty-announcements">
                    <p>Unable to load announcements from server.</p>
                </div>`;
        }
    }

    loadDashboardAnnouncements();

    /* ============================================================
       LECTURE PLANNER (Persisted in Database per user)
       ============================================================ */
    const lectureForm  = document.getElementById("lectureForm");
    const lectureList  = document.getElementById("lectureList");
    const lectureCount = document.getElementById("lectureCount");

    let lectures = [];

    async function fetchLectures() {
        try {
            const res = await authFetch('/api/lectures');
            if (res.ok) {
                const data = await res.json();
                lectures = data.lectures || [];
                renderLectures();
            }
        } catch (err) {
            console.error("Error fetching lectures:", err);
        }
    }

    function renderLectures() {
        if (!lectureCount || !lectureList) return;

        lectureCount.textContent =
            `${lectures.length} ${lectures.length === 1 ? "lecture" : "lectures"}`;

        lectureList.replaceChildren();

        if (lectures.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-state";
            empty.textContent = "No lectures planned yet. Add your first lecture above.";
            lectureList.appendChild(empty);
            return;
        }

        lectures
            .slice()
            .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
            .forEach(lecture => {
                const item = document.createElement("div");
                item.className = `lecture-item${lecture.completed ? " completed" : ""}`;

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "lecture-check";
                checkbox.checked = lecture.completed;
                checkbox.setAttribute("aria-label", "Mark lecture completed");

                checkbox.addEventListener("change", async () => {
                    lecture.completed = checkbox.checked;
                    renderLectures();
                    try {
                        await authFetch(`/api/lectures/${lecture.id}/toggle`, {
                            method: 'PATCH',
                            body: JSON.stringify({ completed: checkbox.checked })
                        });
                    } catch (e) {
                        console.error(e);
                    }
                });

                const details = document.createElement("div");
                details.className = "lecture-details";

                const title = document.createElement("h4");
                title.textContent = lecture.name;

                const date = document.createElement("p");
                date.textContent = `${lecture.date} · ${lecture.time}`;

                details.append(title, date);

                if (lecture.notes) {
                    const notes = document.createElement("p");
                    notes.textContent = lecture.notes;
                    details.appendChild(notes);
                }

                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "delete-lecture";
                remove.textContent = "Delete";
                remove.addEventListener("click", async () => {
                    lectures = lectures.filter(entry => entry.id !== lecture.id);
                    renderLectures();
                    try {
                        await authFetch(`/api/lectures/${lecture.id}`, { method: 'DELETE' });
                    } catch (e) {
                        console.error(e);
                    }
                });

                item.append(checkbox, details, remove);
                lectureList.appendChild(item);
            });
    }

    if (lectureForm) {
        lectureForm.addEventListener("submit", async event => {
            event.preventDefault();

            const name = document.getElementById("lectureName").value.trim();
            const date = document.getElementById("lectureDate").value;
            const time = document.getElementById("lectureTime").value;
            const notes = document.getElementById("lectureNotes").value.trim();

            try {
                const res = await authFetch('/api/lectures', {
                    method: 'POST',
                    body: JSON.stringify({ name, date, time, notes })
                });

                if (res.ok) {
                    const data = await res.json();
                    lectures.push(data.lecture);
                    lectureForm.reset();
                    renderLectures();
                }
            } catch (err) {
                console.error("Error creating lecture:", err);
            }
        });

        fetchLectures();
    }

});

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
