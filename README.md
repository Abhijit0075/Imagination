<div align="center">

# 🧮 IMAGINATION
### *Private JEE Mathematics Coaching & Practice Platform*

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**A secure, full-stack web platform for elite JEE Mathematics coaching.**  
*Built for 200+ concurrent students, powered by MongoDB Atlas, deployed seamlessly on Vercel.*

---

</div>

## 🌟 Overview

**Imagination** is a specialized, private web portal designed exclusively for JEE Mathematics coaching. It equips students with an interactive practice arena, syllabus resources, live announcements, and personalized study planners, while giving instructors full administrative control.

> 🔒 **100% Private Enrollment:** Only approved students enrolled by the administrator can access the portal. There is no public self-signup, ensuring outsider prevention and secure data isolation.

---

## ✨ Features

- 🔐 **Private Enrolled Access:** Student accounts and initial passwords are created and managed by the instructor via the Admin Panel.
- 🧠 **Interactive Practice Arena:** Chapter-wise practice covering 16 core JEE Mathematics chapters.
  - **Single Correct (MCQ)** with randomized options
  - **Multiple Correct (MSQ)** with set-based equality grading
  - **Numerical Value Type** with tolerance-aware validation
  - Instant server-side verification and step-by-step explanations
- 🛠️ **Teacher Admin Portal:**
  - Create student credentials, reset passwords, and manage enrollments
  - Add, preview, and delete custom questions per chapter
  - Broadcast live institute announcements
- 📅 **Live Student Dashboard:**
  - Real-time announcements board
  - Interactive lecture and study planner
  - Authentication-guarded session management
- 📚 **Syllabus & Resources:** Direct downloads and guides for JEE Mains, WBJEE, and JEE Advanced.

---

## 🏗️ Architecture & Folder Structure

```
Imagination/
├── 📁 frontend/                     # Client application (HTML5, CSS3, Vanilla JS)
│   ├── Index.html, LogIn.html, Dashboard.html
│   ├── Practice.html, Syllabus.html, admin.html
│   ├── *.css (component and layout styling)
│   ├── auth.js, login.js, dashboard.js, practice.js, admin.js
│   └── (images and visual assets)
│
├── 📁 backend/                      # Backend API & Database
│   ├── server.js                   # Express REST API (serves frontend statically)
│   ├── db.js                       # Dual-mode engine (MongoDB Atlas ↔ Local JSON)
│   └── api/
│       └── index.js                # Vercel serverless entrypoint
│
├── ⛔ _do_not_push/                 # EXCLUDED FROM GIT (Local data & secrets)
│   ├── data/database.json          # Development records & credentials
│   └── README.txt                  # Local setup documentation
│
├── vercel.json                     # Serverless function & asset routing
├── package.json                    # Project dependencies & startup scripts
├── .env.example                    # Environment variable template
└── .gitignore                      # Secure filter blocking .env & _do_not_push/
```

---

## 🧰 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | HTML5 / CSS3 / Vanilla JS | Fast, responsive, framework-free UI |
| **Backend** | Node.js / Express.js | Scalable REST API with connection pooling |
| **Database** | MongoDB Atlas / Local JSON | Auto-detects `MONGODB_URI` environment variable |
| **Authentication** | JWT (JSON Web Tokens) | 60-day persistent, encrypted tokens |
| **Security** | bcryptjs | Salted hashing for all student and admin passwords |
| **Deployment** | Vercel | Global edge CDN + auto-scaling Serverless functions |

---

## 📐 JEE Mathematics Chapters

| Category | Chapters Included |
|---|---|
| **Calculus** | Limits & Continuity, Application of Derivatives (AOD), Definite & Indefinite Integrals, Differential Equations |
| **Algebra** | Quadratic Equations, Complex Numbers, Sequences & Series, Matrices & Determinants, Permutations & Combinations, Binomial Theorem |
| **Coordinate Geometry** | Straight Lines, Circles, Conic Sections |
| **Vectors & 3D** | Vectors & 3D Geometry |
| **Trigonometry & Stats** | Trigonometric Ratios & Equations, Probability & Statistics |

---

## 🚀 Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/Abhijit0075/Imagination.git
cd Imagination
npm install
```

### 2. Configure Environment
Create a `.env` file using the template:
```bash
cp .env.example .env
```
Add your configuration (e.g. `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

### 3. Start the Server
```bash
npm start
```
The application will be live at `http://localhost:3000`.

---

## ☁️ Deployment on Vercel

1. Import this repository into [Vercel](https://vercel.com).
2. Select **Other** as the framework preset.
3. Add the following **Environment Variables** in project settings:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Random 64-character secret
   - `ADMIN_EMAIL`: Primary admin email
   - `ADMIN_PASSWORD`: Strong master password
   - `NODE_ENV`: `production`
4. Click **Deploy**.

---

## 🔒 Security Best Practices

- Real student credentials and `.env` files are strictly isolated from GitHub using `.gitignore`.
- Answers to practice questions are verified purely on the server side—no solution keys are exposed in client-side network payloads.
- Passwords are encrypted with `bcryptjs` (10 rounds) before storage.

---

<div align="center">

*Empowering students with structured, rigorous mathematics preparation.*

</div>
