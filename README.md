# TaskFlow — CRUD Task Management App

> Built to demonstrate CRUD operations, LocalStorage database simulation, OOP JavaScript, and modern UI design — internship portfolio project.

![TaskFlow Banner](https://img.shields.io/badge/TaskFlow-CRUD%20App-7c3aed?style=for-the-badge&logo=javascript&logoColor=white)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## 🚀 Live Demo

Open `index.html` directly in your browser — no installation needed!

---

## ✨ Features

- ✅ **Full CRUD** — Create, Read, Update, Delete tasks
- 🗄️ **LocalStorage** — Database persistence across sessions
- 📊 **Dashboard analytics** — Stats, progress bar, priority breakdown
- 🔍 **Search + Filter + Sort** — Real-time filtering by status, category & priority
- 🏷️ **Categories** — Work, Study, Personal, Health
- ⚡ **Priority levels** — Low / Medium / High / Urgent with color coding
- ⚠️ **Overdue detection** — Pulsing red badge for past-due tasks
- 🔔 **Toast notifications** — Animated feedback on every action
- ⌨️ **Keyboard shortcuts** — `N` to create, `Esc` to close modals
- 📱 **Fully responsive** — Works on mobile, tablet & desktop

---

## 🏗️ Architecture

```
TaskDB (Database Layer)       TaskApp (Controller Layer)
───────────────────────       ──────────────────────────
 .create(data)      →  POST    Form submit handler
 .readAll()         →  GET     Dashboard render
 .readById(id)      →  GET     Edit modal pre-fill
 .update(id, data)  →  PUT     Edit form submit
 .delete(id)        →  DELETE  Delete confirmation
 .query({filters})  →  GET+    Search/filter/sort
```

> **Note for interviewers:** The `TaskDB` class is a clean abstraction over LocalStorage that mirrors how you'd structure a real REST API or ORM layer. Swapping it for `fetch()` calls to a Node.js/Express backend requires zero changes to the UI layer.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Semantic app structure |
| Vanilla CSS | Glassmorphism dark theme, animations |
| Vanilla JavaScript (ES6+) | OOP, CRUD logic, DOM manipulation |
| LocalStorage | Persistent data store (database simulation) |
| Google Fonts | Inter + Outfit typography |

---

## 📁 File Structure

```
taskflow-crud-app/
├── index.html    # App structure & modals
├── style.css     # Premium dark theme + animations
├── app.js        # TaskDB class + TaskApp controller
└── README.md
```

---

## 🖥️ How to Run

```bash
# Clone the repo
git clone https://github.com/Krishna9423-wagh/taskflow-crud-app.git

# Open in browser
open taskflow-crud-app/index.html
```

---

## 🎯 CRUD Operations

| Operation | Trigger | Method |
|-----------|---------|--------|
| **Create** | "New Task" button or `N` key | `TaskDB.create()` |
| **Read** | Dashboard & task list auto-render | `TaskDB.readAll()` / `TaskDB.query()` |
| **Update** | Hover task → pencil icon | `TaskDB.update()` |
| **Delete** | Hover task → trash icon → confirm | `TaskDB.delete()` |

---

## 📸 Design

- **Color Palette:** Deep navy `#060b18` + Electric violet `#7c3aed` + Cyan `#06b6d4`
- **Style:** Glassmorphism cards with `backdrop-filter: blur`
- **Animations:** Orb background, slide-in cards, animated progress bar, toast notifications

---

Made with ❤️ for internship portfolio | [Krishna Wagh](https://github.com/Krishna9423-wagh)
