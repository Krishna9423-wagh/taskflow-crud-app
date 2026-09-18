/**
 * TaskFlow — CRUD Task Management Application
 * ============================================
 * Demonstrates: Database simulation, CRUD operations,
 * User interactions, Event-driven UI, OOP patterns
 *
 * Architecture:
 *   TaskDB   → Database layer (LocalStorage abstraction)
 *   TaskApp  → Controller layer (Business logic + UI)
 */

'use strict';

/* =====================================================
   DATABASE LAYER — Simulates a real database via LocalStorage
   Exposes: create, readAll, readById, update, delete
   ===================================================== */
class TaskDB {
  #storageKey = 'taskflow_tasks';

  /** Create a new task record */
  create(data) {
    const tasks = this.#getAll();
    const task = {
      id: this.#generateId(),
      title: data.title.trim(),
      description: data.description?.trim() || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      category: data.category || 'Work',
      dueDate: data.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.push(task);
    this.#save(tasks);
    return task;
  }

  /** Read all task records */
  readAll() {
    return this.#getAll();
  }

  /** Read a single task by ID */
  readById(id) {
    return this.#getAll().find(t => t.id === id) || null;
  }

  /** Update a task record by ID */
  update(id, data) {
    const tasks = this.#getAll();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;

    tasks[idx] = {
      ...tasks[idx],
      ...data,
      id: tasks[idx].id,         // immutable
      createdAt: tasks[idx].createdAt, // immutable
      updatedAt: new Date().toISOString(),
    };
    this.#save(tasks);
    return tasks[idx];
  }

  /** Delete a task record by ID */
  delete(id) {
    const tasks = this.#getAll();
    const filtered = tasks.filter(t => t.id !== id);
    if (filtered.length === tasks.length) return false;
    this.#save(filtered);
    return true;
  }

  /** Query tasks with filters */
  query({ status, category, search, sort } = {}) {
    let tasks = this.#getAll();

    // Filter by status
    if (status && status !== 'all') {
      tasks = tasks.filter(t => t.status === status);
    }

    // Filter by category
    if (category && category !== 'all') {
      tasks = tasks.filter(t => t.category === category);
    }

    // Filter by search term
    if (search && search.trim()) {
      const term = search.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term)
      );
    }

    // Sort tasks
    tasks = this.#sort(tasks, sort);

    return tasks;
  }

  /** Get storage usage info */
  getStorageInfo() {
    const raw = localStorage.getItem(this.#storageKey) || '';
    const bytes = new Blob([raw]).size;
    const maxBytes = 5 * 1024 * 1024; // 5MB localStorage limit
    return { bytes, maxBytes, pct: Math.min((bytes / maxBytes) * 100, 100) };
  }

  /* --- Private Helpers --- */

  #getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.#storageKey) || '[]');
    } catch {
      return [];
    }
  }

  #save(tasks) {
    localStorage.setItem(this.#storageKey, JSON.stringify(tasks));
  }

  #generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  #sort(tasks, sortKey) {
    const sorted = [...tasks];
    switch (sortKey) {
      case 'created-asc':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'due-asc':
        return sorted.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
      case 'due-desc':
        return sorted.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate) - new Date(a.dueDate);
        });
      case 'priority-desc': {
        const p = { urgent: 4, high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => (p[b.priority] || 0) - (p[a.priority] || 0));
      }
      default: // created-desc
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }
}


/* =====================================================
   APPLICATION CONTROLLER
   ===================================================== */
class TaskApp {
  #db = new TaskDB();
  #state = {
    currentView: 'dashboard',  // 'dashboard' | 'all' | 'todo' | 'inprogress' | 'done'
    currentCategory: 'all',
    search: '',
    sort: 'created-desc',
    editingId: null,
    deleteTargetId: null,
  };

  init() {
    this.#seedDemoData();
    this.#bindEvents();
    this.#render();
    this.#setGreeting();
  }

  /* ---- Event Bindings ---- */
  #bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const view = item.dataset.view;
        this.#navigateTo(view);
      });
    });

    // Category filter
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.#state.currentCategory = btn.dataset.cat;
        this.#renderTaskList();
      });
    });

    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
      this.#state.search = searchInput.value;
      if (this.#state.currentView === 'dashboard') {
        this.#navigateTo('all');
      }
      this.#renderTaskList();
    });

    // Sort
    document.getElementById('sort-select').addEventListener('change', e => {
      this.#state.sort = e.target.value;
      this.#renderTaskList();
    });

    // Add task button
    document.getElementById('add-task-btn').addEventListener('click', () => this.#openModal());
    document.getElementById('empty-add-btn').addEventListener('click', () => this.#openModal());

    // Modal close
    document.getElementById('modal-close').addEventListener('click', () => this.#closeModal());
    document.getElementById('form-cancel').addEventListener('click', () => this.#closeModal());
    document.getElementById('task-modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.#closeModal();
    });

    // Form submit
    document.getElementById('task-form').addEventListener('submit', e => {
      e.preventDefault();
      this.#handleFormSubmit();
    });

    // Description char count
    document.getElementById('task-description').addEventListener('input', function () {
      document.getElementById('desc-count').textContent = `${this.value.length} / 500`;
    });

    // Delete modal
    document.getElementById('delete-cancel').addEventListener('click', () => this.#closeDeleteModal());
    document.getElementById('delete-modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.#closeDeleteModal();
    });
    document.getElementById('delete-confirm').addEventListener('click', () => {
      if (this.#state.deleteTargetId) {
        this.#db.delete(this.#state.deleteTargetId);
        this.#closeDeleteModal();
        this.#render();
        this.#showToast('Task deleted', 'success');
      }
    });

    // Mobile sidebar toggle
    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Keyboard shortcut: N for new task
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.#closeModal();
        this.#closeDeleteModal();
      }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
        this.#openModal();
      }
    });
  }

  /* ---- Navigation ---- */
  #navigateTo(view) {
    this.#state.currentView = view;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    // Show/hide views
    const isDashboard = view === 'dashboard';
    document.getElementById('view-dashboard').classList.toggle('hidden', !isDashboard);
    document.getElementById('view-tasks').classList.toggle('hidden', isDashboard);

    if (isDashboard) {
      this.#renderDashboard();
    } else {
      const titles = {
        all: 'All Tasks',
        todo: 'To Do',
        inprogress: 'In Progress',
        done: 'Completed',
      };
      document.getElementById('tasks-view-title').textContent = titles[view] || 'Tasks';
      this.#renderTaskList();
    }
  }

  /* ---- Full Render ---- */
  #render() {
    this.#renderDashboard();
    this.#renderBadges();
    this.#renderStorage();
    if (this.#state.currentView !== 'dashboard') {
      this.#renderTaskList();
    }
  }

  /* ---- Dashboard ---- */
  #renderDashboard() {
    const all = this.#db.readAll();
    const now = new Date(); now.setHours(0,0,0,0);

    const total = all.length;
    const inProgress = all.filter(t => t.status === 'inprogress').length;
    const done = all.filter(t => t.status === 'done').length;
    const overdue = all.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return new Date(t.dueDate) < now;
    }).length;

    const pct = total ? Math.round((done / total) * 100) : 0;

    // Stats
    this.#animateCount('stat-total', total);
    this.#animateCount('stat-inprogress', inProgress);
    this.#animateCount('stat-done', done);
    this.#animateCount('stat-overdue', overdue);

    // Progress
    document.getElementById('overall-progress').style.width = `${pct}%`;
    document.getElementById('progress-pct').textContent = `${pct}%`;
    document.getElementById('progress-label-done').textContent = `${done} completed`;
    document.getElementById('progress-label-total').textContent = `of ${total} tasks`;

    // Priority breakdown
    this.#renderPriorityBars(all);

    // Recent tasks
    this.#renderRecentList(all);

    // Badges
    this.#renderBadges();
    this.#renderStorage();
  }

  #renderPriorityBars(tasks) {
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });
    const max = Math.max(...Object.values(counts), 1);

    const colors = {
      urgent: 'var(--priority-urgent)',
      high: 'var(--priority-high)',
      medium: 'var(--priority-medium)',
      low: 'var(--priority-low)',
    };

    document.getElementById('priority-bars').innerHTML = Object.entries(counts).map(([p, c]) => `
      <div class="priority-bar-row">
        <span class="priority-bar-label">${p}</span>
        <div class="priority-bar-track">
          <div class="priority-bar-fill" style="width:${(c/max)*100}%; background:${colors[p]}"></div>
        </div>
        <span class="priority-bar-count">${c}</span>
      </div>
    `).join('');
  }

  #renderRecentList(tasks) {
    const recent = [...tasks]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const colors = {
      urgent: 'var(--priority-urgent)',
      high: 'var(--priority-high)',
      medium: 'var(--priority-medium)',
      low: 'var(--priority-low)',
    };

    const container = document.getElementById('recent-list');
    if (!recent.length) {
      container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0;">No tasks yet</p>`;
      return;
    }

    container.innerHTML = recent.map(t => `
      <div class="recent-item">
        <span class="recent-dot" style="background:${colors[t.priority]}"></span>
        <span class="recent-title">${this.#escHtml(t.title)}</span>
        <span class="recent-date">${this.#formatDate(t.createdAt)}</span>
      </div>
    `).join('');
  }

  /* ---- Task List ---- */
  #renderTaskList() {
    const { currentView, currentCategory, search, sort } = this.#state;
    const status = currentView === 'all' ? null : currentView;

    const tasks = this.#db.query({ status, category: currentCategory, search, sort });

    const label = tasks.length === 1 ? '1 task' : `${tasks.length} tasks`;
    document.getElementById('tasks-count-label').textContent = label;

    const listEl = document.getElementById('task-list');
    const emptyEl = document.getElementById('empty-state');

    if (!tasks.length) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    listEl.innerHTML = tasks.map(t => this.#renderTaskCard(t)).join('');

    // Bind card events
    listEl.querySelectorAll('.task-card').forEach(card => {
      const id = card.dataset.id;

      // Checkbox toggle
      card.querySelector('.task-checkbox').addEventListener('click', () => {
        const task = this.#db.readById(id);
        if (!task) return;
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        this.#db.update(id, { status: newStatus });
        this.#render();
        this.#showToast(newStatus === 'done' ? '✓ Task completed!' : 'Task marked as To Do', 'success');
      });

      // Edit button
      card.querySelector('.edit-btn').addEventListener('click', () => {
        this.#openModal(id);
      });

      // Delete button
      card.querySelector('.delete-btn').addEventListener('click', () => {
        this.#openDeleteModal(id);
      });
    });
  }

  #renderTaskCard(task) {
    const now = new Date(); now.setHours(0,0,0,0);
    const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < now;
    const isChecked = task.status === 'done';

    return `
      <div class="task-card priority-${task.priority} ${isChecked ? 'done-card' : ''}" data-id="${task.id}">
        <div class="task-checkbox ${isChecked ? 'checked' : ''}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="task-body">
          <div class="task-title">${this.#escHtml(task.title)}</div>
          ${task.description ? `<div class="task-desc">${this.#escHtml(task.description)}</div>` : ''}
          <div class="task-meta">
            <span class="badge badge-priority-${task.priority}">${task.priority}</span>
            <span class="badge badge-status-${task.status}">${this.#statusLabel(task.status)}</span>
            <span class="badge badge-cat-${task.category.toLowerCase()}">${task.category}</span>
            ${task.dueDate ? `
              <span class="badge ${isOverdue ? 'badge-overdue' : 'badge-due'}">
                ${isOverdue ? '⚠ ' : '📅 '}${this.#formatDueDate(task.dueDate)}
              </span>
            ` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn edit-btn" aria-label="Edit task" title="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="task-action-btn delete-btn" aria-label="Delete task" title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  /* ---- Badge Counts ---- */
  #renderBadges() {
    const all = this.#db.readAll();
    document.getElementById('badge-todo').textContent = all.filter(t => t.status === 'todo').length;
    document.getElementById('badge-inprogress').textContent = all.filter(t => t.status === 'inprogress').length;
    document.getElementById('badge-done').textContent = all.filter(t => t.status === 'done').length;
  }

  /* ---- Storage Indicator ---- */
  #renderStorage() {
    const { bytes, pct } = this.#db.getStorageInfo();
    const kb = (bytes / 1024).toFixed(2);
    document.getElementById('storage-fill').style.width = `${pct}%`;
    document.getElementById('storage-label').textContent = `${kb} KB`;
  }

  /* ---- Modal (Create / Edit) ---- */
  #openModal(id = null) {
    this.#state.editingId = id;
    const modal = document.getElementById('task-modal-overlay');
    const form = document.getElementById('task-form');
    form.reset();
    document.getElementById('desc-count').textContent = '0 / 500';
    document.getElementById('title-error').textContent = '';

    if (id) {
      const task = this.#db.readById(id);
      if (!task) return;
      document.getElementById('modal-title').textContent = 'Edit Task';
      document.getElementById('form-submit').innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Update Task
      `;
      document.getElementById('task-id').value = task.id;
      document.getElementById('task-title').value = task.title;
      document.getElementById('task-description').value = task.description;
      document.getElementById('task-status').value = task.status;
      document.getElementById('task-priority').value = task.priority;
      document.getElementById('task-category').value = task.category;
      document.getElementById('task-due').value = task.dueDate || '';
      document.getElementById('desc-count').textContent = `${task.description.length} / 500`;
    } else {
      document.getElementById('modal-title').textContent = 'New Task';
      document.getElementById('form-submit').innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Save Task
      `;
      document.getElementById('task-id').value = '';
      // Set min due date to today
      document.getElementById('task-due').min = new Date().toISOString().split('T')[0];
    }

    modal.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('task-title').focus());
  }

  #closeModal() {
    document.getElementById('task-modal-overlay').classList.add('hidden');
    this.#state.editingId = null;
  }

  /* ---- Form Submit (CREATE / UPDATE) ---- */
  #handleFormSubmit() {
    const title = document.getElementById('task-title').value.trim();
    if (!title) {
      document.getElementById('title-error').textContent = 'Title is required.';
      document.getElementById('task-title').focus();
      return;
    }
    document.getElementById('title-error').textContent = '';

    const data = {
      title,
      description: document.getElementById('task-description').value,
      status: document.getElementById('task-status').value,
      priority: document.getElementById('task-priority').value,
      category: document.getElementById('task-category').value,
      dueDate: document.getElementById('task-due').value || null,
    };

    const editId = document.getElementById('task-id').value;

    if (editId) {
      // UPDATE
      this.#db.update(editId, data);
      this.#closeModal();
      this.#render();
      this.#showToast('Task updated successfully', 'info');
    } else {
      // CREATE
      this.#db.create(data);
      this.#closeModal();
      if (this.#state.currentView === 'dashboard') {
        this.#renderDashboard();
      } else {
        this.#render();
      }
      this.#render();
      this.#showToast('New task created!', 'success');
    }
  }

  /* ---- Delete Modal ---- */
  #openDeleteModal(id) {
    this.#state.deleteTargetId = id;
    document.getElementById('delete-modal-overlay').classList.remove('hidden');
  }

  #closeDeleteModal() {
    document.getElementById('delete-modal-overlay').classList.add('hidden');
    this.#state.deleteTargetId = null;
  }

  /* ---- Toast Notifications ---- */
  #showToast(message, type = 'success') {
    const icons = {
      success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
  }

  /* ---- Greeting ---- */
  #setGreeting() {
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('greeting-text').textContent = `${greet}! Here's your task overview.`;
  }

  /* ---- Animate Counter ---- */
  #animateCount(elId, target) {
    const el = document.getElementById(elId);
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;
    const duration = 500;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(current + (target - current) * this.#easeOut(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  #easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---- Seed Demo Data ---- */
  #seedDemoData() {
    if (this.#db.readAll().length > 0) return; // Already has data

    const demos = [
      {
        title: 'Complete React internship project',
        description: 'Build a full-stack e-commerce app using React + Node.js as the main internship project.',
        status: 'inprogress', priority: 'urgent', category: 'Work',
        dueDate: this.#futureDateStr(3),
      },
      {
        title: 'Learn SQL fundamentals',
        description: 'Study JOINs, indexes, transactions and practice on PostgreSQL.',
        status: 'todo', priority: 'high', category: 'Study',
        dueDate: this.#futureDateStr(7),
      },
      {
        title: 'Prepare resume and portfolio',
        description: 'Update LinkedIn, GitHub and build personal portfolio site.',
        status: 'inprogress', priority: 'high', category: 'Work',
        dueDate: this.#futureDateStr(5),
      },
      {
        title: 'Practice DSA problems on LeetCode',
        description: 'Solve 2 easy and 1 medium problem daily for interview prep.',
        status: 'todo', priority: 'medium', category: 'Study',
        dueDate: this.#futureDateStr(14),
      },
      {
        title: 'Morning workout routine',
        description: '30-minute jog + 20-minute strength training.',
        status: 'done', priority: 'medium', category: 'Health',
        dueDate: this.#futureDateStr(-1),
      },
      {
        title: 'Read "Clean Code" chapters 1-3',
        description: 'Focus on naming conventions and function principles.',
        status: 'done', priority: 'low', category: 'Study',
        dueDate: this.#futureDateStr(-2),
      },
      {
        title: 'Set up dev environment on new laptop',
        description: 'Install Node.js, VS Code, Git and configure SSH keys.',
        status: 'done', priority: 'high', category: 'Work',
        dueDate: null,
      },
      {
        title: 'Apply to 5 internships this week',
        description: 'Target companies: Google, Microsoft, Flipkart, Paytm, Razorpay.',
        status: 'todo', priority: 'urgent', category: 'Work',
        dueDate: this.#futureDateStr(2),
      },
    ];

    demos.forEach(d => this.#db.create(d));
  }

  /* ---- Utility ---- */
  #futureDateStr(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  #formatDate(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  #formatDueDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date(); now.setHours(0,0,0,0);
    const diff = Math.round((d - now) / 86400000);
    if (diff === 0) return 'Due Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 0) return `${diff}d left`;
    return `${Math.abs(diff)}d overdue`;
  }

  #statusLabel(s) {
    return { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[s] || s;
  }

  #escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}

/* =====================================================
   Bootstrap
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const app = new TaskApp();
  app.init();
});
