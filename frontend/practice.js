/*  ============================================================
    practice.js  –  Interactive JEE Mathematics Practice Arena
    Option to choose any JEE chapter, solve MCQ/MSQ/Numerical,
    and receive instant evaluation + step-by-step solutions!
    ============================================================ */

authReady.then(async (currentUser) => {

    const chaptersView   = document.getElementById("chaptersView");
    const practiceArena  = document.getElementById("practiceArena");
    const chaptersGrid   = document.getElementById("chaptersGrid");
    const categoryBtns   = document.querySelectorAll(".cat-btn");

    let allChapters = [];
    let currentCategory = "all";

    let currentChapter = null;
    let questions = [];
    let currentIndex = 0;
    let studentScore = 0;
    let attemptedQuestions = new Set();
    let selectedAnswer = null; // string for single/numerical, array for multiple

    /* ============================================================
       1. LOAD CHAPTERS CATALOG
       ============================================================ */
    async function loadChapters() {
        try {
            const res = await authFetch('/api/practice/chapters');
            if (!res.ok) throw new Error('Failed to load chapters');
            const data = await res.json();
            allChapters = data.chapters || [];
            renderChapters();
        } catch (err) {
            console.error('Error loading chapters:', err);
            chaptersGrid.innerHTML = '<div class="empty-state">Unable to load chapters. Please ensure the server is running.</div>';
        }
    }

    // Category filter clicks
    categoryBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            categoryBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentCategory = btn.dataset.cat;
            renderChapters();
        });
    });

    function renderChapters() {
        const filtered = currentCategory === "all"
            ? allChapters
            : allChapters.filter(ch => ch.category.toLowerCase() === currentCategory.toLowerCase());

        if (filtered.length === 0) {
            chaptersGrid.innerHTML = `<div class="empty-state">No chapters found under this topic.</div>`;
            return;
        }

        chaptersGrid.innerHTML = filtered.map(ch => `
            <div class="chapter-card" data-id="${ch.id}" data-name="${escapeHtml(ch.name)}">
                <div>
                    <div class="chapter-top">
                        <span class="chapter-cat-badge">${escapeHtml(ch.category)}</span>
                        <span class="chapter-q-badge">${ch.questionCount} Questions</span>
                    </div>
                    <h3>${escapeHtml(ch.name)}</h3>
                </div>
                <div class="chapter-footer">
                    <span style="font-size:12px; color:#94A3B8;">JEE Main & Adv</span>
                    <span class="btn-start-practice">Practice Now →</span>
                </div>
            </div>
        `).join("");

        // Attach click handlers to start practice
        chaptersGrid.querySelectorAll(".chapter-card").forEach(card => {
            card.addEventListener("click", () => {
                startChapterPractice(card.dataset.id, card.dataset.name);
            });
        });
    }

    /* ============================================================
       2. START CHAPTER PRACTICE SESSION
       ============================================================ */
    async function startChapterPractice(chapterId, chapterName) {
        currentChapter = { id: chapterId, name: chapterName };
        currentIndex = 0;
        studentScore = 0;
        attemptedQuestions.clear();

        document.getElementById("arenaChapterTitle").textContent = chapterName;
        updateScoreBadge();

        chaptersView.style.display = "none";
        practiceArena.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });

        const qBox = document.getElementById("questionContainer");
        qBox.innerHTML = '<div class="empty-state">Loading questions from database…</div>';

        try {
            const res = await authFetch(`/api/practice/questions?chapter=${encodeURIComponent(chapterId)}`);
            if (!res.ok) throw new Error('Failed to load questions');
            const data = await res.json();
            questions = data.questions || [];

            if (questions.length === 0) {
                qBox.innerHTML = `
                    <div class="empty-state" style="padding: 40px 20px;">
                        <div style="font-size: 36px; margin-bottom: 10px;">📚</div>
                        <h3>No questions added for this chapter yet</h3>
                        <p style="color: var(--muted); margin-top: 6px;">Your teacher will add questions for "${escapeHtml(chapterName)}" soon.</p>
                        <button class="nav-q-btn" onclick="document.getElementById('btnBackToChapters').click()" style="margin-top: 18px;">← Back to Chapters</button>
                    </div>`;
                document.getElementById("arenaActions").style.display = "none";
                return;
            }

            document.getElementById("arenaActions").style.display = "flex";
            renderCurrentQuestion();

        } catch (err) {
            console.error('Error fetching questions:', err);
            qBox.innerHTML = '<div class="empty-state">Error loading questions.</div>';
        }
    }

    // Back to chapters button
    document.getElementById("btnBackToChapters").addEventListener("click", () => {
        practiceArena.style.display = "none";
        chaptersView.style.display = "block";
        loadChapters(); // refresh counts
    });

    /* ============================================================
       3. RENDER CURRENT QUESTION & OPTIONS
       ============================================================ */
    function renderCurrentQuestion() {
        const q = questions[currentIndex];
        if (!q) return;

        // Reset state for new question
        selectedAnswer = q.type === "multiple" ? [] : null;

        const qBox = document.getElementById("questionContainer");
        const feedbackBox = document.getElementById("feedbackBox");
        feedbackBox.className = "feedback-box";
        feedbackBox.style.display = "none";

        const submitBtn = document.getElementById("btnSubmitAnswer");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Answer";

        // Navigation button states
        document.getElementById("btnPrevQ").disabled = currentIndex === 0;
        document.getElementById("btnNextQ").disabled = currentIndex === questions.length - 1;

        // Question Type Tag
        let typeLabel = "Single Choice (MCQ)";
        let typeClass = "type-single";
        if (q.type === "multiple") {
            typeLabel = "Multiple Choice (MSQ - One or more correct)";
            typeClass = "type-multiple";
        } else if (q.type === "numerical") {
            typeLabel = "Numerical Value Type";
            typeClass = "type-numerical";
        }

        // Render options UI
        let optionsHtml = "";
        if (q.type === "single") {
            optionsHtml = `
                <div class="options-list" id="optionsList">
                    ${(q.options || []).map(opt => `
                        <div class="option-item" data-opt="${escapeHtml(opt.id)}">
                            <span class="option-circle">${escapeHtml(opt.id)}</span>
                            <span class="option-text">${escapeHtml(opt.text)}</span>
                        </div>
                    `).join("")}
                </div>`;
        } else if (q.type === "multiple") {
            optionsHtml = `
                <p style="font-size:12px; color:#6B21A8; font-weight:700; margin-bottom:12px;">Select all options that apply (one or more):</p>
                <div class="options-list" id="optionsList">
                    ${(q.options || []).map(opt => `
                        <div class="option-item" data-opt="${escapeHtml(opt.id)}">
                            <span class="option-circle" style="border-radius:6px;">${escapeHtml(opt.id)}</span>
                            <span class="option-text">${escapeHtml(opt.text)}</span>
                        </div>
                    `).join("")}
                </div>`;
        } else if (q.type === "numerical") {
            optionsHtml = `
                <div class="numerical-input-container">
                    <label for="numericalAnswerInput">Enter your numerical answer (Integer or Decimal):</label>
                    <input type="number" step="any" id="numericalAnswerInput" class="numerical-input" placeholder="e.g. 6 or 0.5" autocomplete="off">
                </div>`;
        }

        qBox.innerHTML = `
            <div class="question-meta-row">
                <span class="q-index-pill">Question ${currentIndex + 1} of ${questions.length}</span>
                <span class="q-type-badge ${typeClass}">${typeLabel}</span>
                <span class="q-difficulty">${escapeHtml(q.difficulty || "JEE Main")}</span>
            </div>
            <div class="question-text">${escapeHtml(q.questionText)}</div>
            ${optionsHtml}
        `;

        // Attach event listeners for selection
        if (q.type === "single") {
            qBox.querySelectorAll(".option-item").forEach(item => {
                item.addEventListener("click", () => {
                    if (attemptedQuestions.has(q.id)) return; // locked after submission
                    qBox.querySelectorAll(".option-item").forEach(i => i.classList.remove("selected"));
                    item.classList.add("selected");
                    selectedAnswer = item.dataset.opt;
                });
            });
        } else if (q.type === "multiple") {
            qBox.querySelectorAll(".option-item").forEach(item => {
                item.addEventListener("click", () => {
                    if (attemptedQuestions.has(q.id)) return;
                    const optId = item.dataset.opt;
                    if (selectedAnswer.includes(optId)) {
                        selectedAnswer = selectedAnswer.filter(o => o !== optId);
                        item.classList.remove("selected");
                    } else {
                        selectedAnswer.push(optId);
                        item.classList.add("selected");
                    }
                });
            });
        } else if (q.type === "numerical") {
            const numInput = document.getElementById("numericalAnswerInput");
            if (numInput) {
                numInput.addEventListener("input", (e) => {
                    selectedAnswer = e.target.value.trim();
                });
                numInput.focus();
            }
        }
    }

    /* ============================================================
       4. SUBMIT ANSWER & INSTANT VERIFICATION
       ============================================================ */
    document.getElementById("btnSubmitAnswer").addEventListener("click", async () => {
        const q = questions[currentIndex];
        if (!q) return;

        if (selectedAnswer === null || selectedAnswer === "" || (Array.isArray(selectedAnswer) && selectedAnswer.length === 0)) {
            alert("Please select or enter an answer before submitting.");
            return;
        }

        const submitBtn = document.getElementById("btnSubmitAnswer");
        submitBtn.disabled = true;
        submitBtn.textContent = "Verifying…";

        try {
            const res = await authFetch('/api/practice/verify', {
                method: 'POST',
                body: JSON.stringify({
                    questionId: q.id,
                    studentAnswer: selectedAnswer
                })
            });

            if (!res.ok) throw new Error('Answer check failed');
            const result = await res.json();

            // Lock this question
            attemptedQuestions.add(q.id);

            // Update score
            if (result.isCorrect) {
                studentScore += 1;
            }
            updateScoreBadge();

            // Render feedback
            const feedbackBox = document.getElementById("feedbackBox");
            const isCorrect = result.isCorrect;

            let answerDisplay = "";
            if (Array.isArray(result.correctAnswer)) {
                answerDisplay = result.correctAnswer.join(", ");
            } else {
                answerDisplay = String(result.correctAnswer);
            }

            feedbackBox.className = `feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`;
            feedbackBox.innerHTML = `
                <div class="feedback-title">
                    <span>${isCorrect ? '🎉 Correct Answer! (+4 Marks)' : '❌ Incorrect Attempt (0 Marks)'}</span>
                </div>
                <div class="feedback-answer-reveal">
                    <strong>Correct Answer:</strong> Option ${escapeHtml(answerDisplay)}
                </div>
                <div class="feedback-explanation">
                    <strong>Step-by-Step Solution & Concept:</strong>\n${escapeHtml(result.explanation || "No step-by-step solution provided.")}
                </div>
            `;
            feedbackBox.style.display = "block";

            submitBtn.textContent = isCorrect ? "✓ Answer Checked (Correct)" : "✓ Answer Checked (Incorrect)";

            // Scroll gently to solution
            feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });

        } catch (err) {
            console.error('Error verifying answer:', err);
            alert("Error submitting answer. Please try again.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Answer";
        }
    });

    // Navigation buttons
    document.getElementById("btnPrevQ").addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderCurrentQuestion();
        }
    });

    document.getElementById("btnNextQ").addEventListener("click", () => {
        if (currentIndex < questions.length - 1) {
            currentIndex++;
            renderCurrentQuestion();
        }
    });

    function updateScoreBadge() {
        const badge = document.getElementById("arenaScoreBadge");
        if (badge) {
            const total = questions.length || 0;
            badge.textContent = `Score: ${studentScore} Correct (Attempted: ${attemptedQuestions.size}/${total})`;
        }
    }

    // Initial load of chapters
    loadChapters();
});

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
}
