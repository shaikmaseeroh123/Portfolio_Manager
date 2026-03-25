/**
 * Portfolio Manager Application
 * A complete project and task management system
 * Built with Vanilla JavaScript
 */

// ============================================
// APPLICATION STATE
// ============================================

const AppState = {
    projects: [],
    tasks: [],
    activities: [],
    currentView: 'dashboard',
    editingProject: null,
    editingTask: null,
    theme: localStorage.getItem('theme') || 'light'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const Utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return Utils.formatDate(dateString);
    },

    saveToStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    loadFromStorage(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    getCategoryLabel(category) {
        const labels = {
            'web': 'Web Development',
            'mobile': 'Mobile App',
            'design': 'Design',
            'marketing': 'Marketing',
            'other': 'Other'
        };
        return labels[category] || category;
    }
};

// ============================================
// DOM ELEMENTS
// ============================================

const DOM = {
    // Views
    views: document.querySelectorAll('.view'),
    navItems: document.querySelectorAll('.nav-item'),
    
    // Dashboard elements
    totalProjects: document.getElementById('totalProjects'),
    completedProjects: document.getElementById('completedProjects'),
    inProgress: document.getElementById('inProgress'),
    totalTasks: document.getElementById('totalTasks'),
    recentProjects: document.getElementById('recentProjects'),
    activityList: document.getElementById('activityList'),
    upcomingTasks: document.getElementById('upcomingTasks'),
    
    // Projects view
    allProjects: document.getElementById('allProjects'),
    projectFilter: document.getElementById('projectFilter'),
    
    // Tasks view
    kanbanBoard: document.getElementById('kanbanBoard'),
    
    // Modals
    projectModal: document.getElementById('projectModal'),
    taskModal: document.getElementById('taskModal'),
    projectDetailModal: document.getElementById('projectDetailModal'),
    
    // Forms
    projectForm: document.getElementById('projectForm'),
    taskForm: document.getElementById('taskForm'),
    
    // Buttons
    newProjectBtns: [document.getElementById('newProjectBtn'), document.getElementById('newProjectBtn2')],
    newTaskBtn: document.getElementById('newTaskBtn'),
    
    // Other
    searchInput: document.getElementById('searchInput'),
    themeToggle: document.getElementById('themeToggle'),
    menuToggle: document.getElementById('menuToggle'),
    sidebar: document.querySelector('.sidebar'),
    toastContainer: document.getElementById('toastContainer')
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================

const Toast = {
    show(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;

        DOM.toastContainer.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => Toast.remove(toast));

        setTimeout(() => Toast.remove(toast), 4000);
    },

    remove(toast) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }
};

// ============================================
// THEME MANAGEMENT
// ============================================

const Theme = {
    init() {
        document.documentElement.setAttribute('data-theme', AppState.theme);
        DOM.themeToggle.addEventListener('click', () => this.toggle());
    },

    toggle() {
        AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', AppState.theme);
        localStorage.setItem('theme', AppState.theme);
    }
};

// ============================================
// NAVIGATION
// ============================================

const Navigation = {
    init() {
        DOM.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
            });
        });

        // View all links
        document.querySelectorAll('.view-all').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                this.switchView(view);
            });
        });

        // Mobile menu toggle
        DOM.menuToggle.addEventListener('click', () => {
            DOM.sidebar.classList.toggle('active');
        });
    },

    switchView(viewName) {
        AppState.currentView = viewName;

        DOM.views.forEach(view => {
            view.classList.remove('active');
            if (view.id === `${viewName}View`) {
                view.classList.add('active');
            }
        });

        DOM.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            }
        });

        // Close mobile menu
        DOM.sidebar.classList.remove('active');

        // Update view-specific content
        if (viewName === 'projects') {
            Projects.renderAll();
        } else if (viewName === 'tasks') {
            Tasks.renderKanban();
        } else if (viewName === 'analytics') {
            Analytics.render();
        }
    }
};

// ============================================
// PROJECTS MODULE
// ============================================

const Projects = {
    init() {
        // Load from storage
        AppState.projects = Utils.loadFromStorage('projects') || this.getSampleData();

        // Event listeners
        DOM.newProjectBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.openModal());
            }
        });

        DOM.projectForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        if (DOM.projectFilter) {
            DOM.projectFilter.addEventListener('change', () => this.renderAll());
        }

        // Modal close buttons
        document.querySelectorAll('#projectModal .modal-close, #projectModal .modal-cancel, #projectModal .modal-overlay').forEach(el => {
            el.addEventListener('click', () => this.closeModal());
        });

        // Project detail modal
        document.querySelectorAll('#projectDetailModal .modal-close, #projectDetailModal .modal-overlay').forEach(el => {
            el.addEventListener('click', () => this.closeDetailModal());
        });
    },

    getSampleData() {
        return [
            {
                id: Utils.generateId(),
                name: 'E-Commerce Platform',
                description: 'Building a modern e-commerce platform with React and Node.js. Features include product management, shopping cart, and payment integration.',
                category: 'web',
                status: 'active',
                color: '#6366f1',
                startDate: '2024-01-15',
                deadline: '2024-04-30',
                progress: 65,
                createdAt: new Date().toISOString()
            },
            {
                id: Utils.generateId(),
                name: 'Mobile Banking App',
                description: 'Cross-platform mobile application for banking services with biometric authentication and real-time notifications.',
                category: 'mobile',
                status: 'active',
                color: '#10b981',
                startDate: '2024-02-01',
                deadline: '2024-06-15',
                progress: 40,
                createdAt: new Date().toISOString()
            },
            {
                id: Utils.generateId(),
                name: 'Brand Identity Design',
                description: 'Complete brand identity package including logo, color palette, typography, and brand guidelines.',
                category: 'design',
                status: 'completed',
                color: '#ec4899',
                startDate: '2024-01-01',
                deadline: '2024-02-28',
                progress: 100,
                createdAt: new Date().toISOString()
            },
            {
                id: Utils.generateId(),
                name: 'Social Media Campaign',
                description: 'Q2 social media marketing campaign across multiple platforms with influencer partnerships.',
                category: 'marketing',
                status: 'on-hold',
                color: '#f59e0b',
                startDate: '2024-03-01',
                deadline: '2024-05-31',
                progress: 20,
                createdAt: new Date().toISOString()
            }
        ];
    },

    openModal(project = null) {
        AppState.editingProject = project;
        const modal = DOM.projectModal;
        const title = document.getElementById('projectModalTitle');
        
        if (project) {
            title.textContent = 'Edit Project';
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectDescription').value = project.description;
            document.getElementById('projectCategory').value = project.category;
            document.getElementById('projectStatus').value = project.status;
            document.getElementById('projectStart').value = project.startDate;
            document.getElementById('projectDeadline').value = project.deadline;
            
            const colorRadio = document.querySelector(`input[name="projectColor"][value="${project.color}"]`);
            if (colorRadio) colorRadio.checked = true;
        } else {
            title.textContent = 'New Project';
            DOM.projectForm.reset();
        }

        modal.classList.add('active');
    },

    closeModal() {
        DOM.projectModal.classList.remove('active');
        AppState.editingProject = null;
        DOM.projectForm.reset();
    },

    handleSubmit(e) {
        e.preventDefault();

        const projectData = {
            name: document.getElementById('projectName').value,
            description: document.getElementById('projectDescription').value,
            category: document.getElementById('projectCategory').value,
            status: document.getElementById('projectStatus').value,
            startDate: document.getElementById('projectStart').value,
            deadline: document.getElementById('projectDeadline').value,
            color: document.querySelector('input[name="projectColor"]:checked').value
        };

        if (AppState.editingProject) {
            // Update existing project
            const index = AppState.projects.findIndex(p => p.id === AppState.editingProject.id);
            if (index !== -1) {
                AppState.projects[index] = { ...AppState.projects[index], ...projectData };
                Activities.add('updated', `Updated project "${projectData.name}"`);
                Toast.show('Project updated successfully!');
            }
        } else {
            // Create new project
            const newProject = {
                id: Utils.generateId(),
                ...projectData,
                progress: 0,
                createdAt: new Date().toISOString()
            };
            AppState.projects.unshift(newProject);
            Activities.add('created', `Created new project "${projectData.name}"`);
            Toast.show('Project created successfully!');
        }

        this.save();
        this.closeModal();
        Dashboard.render();
        
        if (AppState.currentView === 'projects') {
            this.renderAll();
        }
    },

    delete(projectId) {
        const project = AppState.projects.find(p => p.id === projectId);
        if (project && confirm(`Are you sure you want to delete "${project.name}"?`)) {
            AppState.projects = AppState.projects.filter(p => p.id !== projectId);
            AppState.tasks = AppState.tasks.filter(t => t.projectId !== projectId);
            
            Activities.add('deleted', `Deleted project "${project.name}"`);
            Toast.show('Project deleted', 'info');
            
            this.save();
            Tasks.save();
            Dashboard.render();
            this.closeDetailModal();
            
            if (AppState.currentView === 'projects') {
                this.renderAll();
            }
        }
    },

    updateProgress(projectId) {
        const projectTasks = AppState.tasks.filter(t => t.projectId === projectId);
        if (projectTasks.length === 0) return;

        const completedTasks = projectTasks.filter(t => t.status === 'done').length;
        const progress = Math.round((completedTasks / projectTasks.length) * 100);

        const project = AppState.projects.find(p => p.id === projectId);
        if (project) {
            project.progress = progress;
            this.save();
        }
    },

    save() {
        Utils.saveToStorage('projects', AppState.projects);
    },

    renderCard(project, compact = false) {
        const projectTasks = AppState.tasks.filter(t => t.projectId === project.id);
        const completedTasks = projectTasks.filter(t => t.status === 'done').length;

        return `
            <div class="project-card" data-id="${project.id}" style="--project-color: ${project.color}">
                <div class="project-header">
                    <div>
                        <h3 class="project-title">${project.name}</h3>
                        <span class="project-category">${Utils.getCategoryLabel(project.category)}</span>
                    </div>
                    <button class="project-menu">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="12" cy="5" r="1"/>
                            <circle cx="12" cy="19" r="1"/>
                        </svg>
                    </button>
                </div>
                <p class="project-description">${project.description}</p>
                <div class="project-progress">
                    <div class="progress-header">
                        <span class="progress-label">Progress</span>
                        <span class="progress-value">${project.progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${project.progress}%"></div>
                    </div>
                </div>
                <div class="project-footer">
                    <div class="project-stats">
                        <span class="project-stat">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 11l3 3L22 4"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                            ${completedTasks}/${projectTasks.length}
                        </span>
                        ${project.deadline ? `
                            <span class="project-stat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <path d="M16 2v4M8 2v4M3 10h18"/>
                                </svg>
                                ${Utils.formatDate(project.deadline)}
                            </span>
                        ` : ''}
                    </div>
                    <span class="project-status ${project.status}">${project.status.replace('-', ' ')}</span>
                </div>
            </div>
        `;
    },

    renderRecent() {
        const recentProjects = AppState.projects.slice(0, 4);
        
        if (recentProjects.length === 0) {
            DOM.recentProjects.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <h3>No projects yet</h3>
                    <p>Create your first project to get started</p>
                </div>
            `;
            return;
        }

        DOM.recentProjects.innerHTML = recentProjects.map(p => this.renderCard(p)).join('');
        this.attachCardListeners();
    },

    renderAll() {
        const filter = DOM.projectFilter ? DOM.projectFilter.value : 'all';
        let projects = [...AppState.projects];

        if (filter !== 'all') {
            projects = projects.filter(p => p.status === filter);
        }

        if (projects.length === 0) {
            DOM.allProjects.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <h3>No projects found</h3>
                    <p>${filter === 'all' ? 'Create your first project to get started' : 'No projects match this filter'}</p>
                </div>
            `;
            return;
        }

        DOM.allProjects.innerHTML = `
            <div class="projects-grid">
                ${projects.map(p => this.renderCard(p)).join('')}
            </div>
        `;
        this.attachCardListeners();
    },

    attachCardListeners() {
        document.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.project-menu')) {
                    const projectId = card.dataset.id;
                    this.openDetailModal(projectId);
                }
            });
        });
    },

    openDetailModal(projectId) {
        const project = AppState.projects.find(p => p.id === projectId);
        if (!project) return;

        const modal = DOM.projectDetailModal;
        const projectTasks = AppState.tasks.filter(t => t.projectId === projectId);

        document.getElementById('detailProjectName').textContent = project.name;
        document.getElementById('detailStatus').textContent = project.status.replace('-', ' ');
        document.getElementById('detailStatus').className = `detail-badge ${project.status}`;
        document.getElementById('detailCategory').textContent = Utils.getCategoryLabel(project.category);
        document.getElementById('detailDescription').textContent = project.description || 'No description provided.';
        document.getElementById('detailProgress').style.width = `${project.progress}%`;
        document.getElementById('detailProgressText').textContent = `${project.progress}% Complete`;

        const tasksContainer = document.getElementById('detailTasks');
        if (projectTasks.length === 0) {
            tasksContainer.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No tasks yet</p>';
        } else {
            tasksContainer.innerHTML = projectTasks.map(task => `
                <div class="task-item ${task.status === 'done' ? 'completed' : ''}" data-id="${task.id}">
                    <div class="task-checkbox ${task.status === 'done' ? 'checked' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                    </div>
                    <div class="task-content">
                        <span class="task-title">${task.name}</span>
                        <div class="task-meta">
                            <span class="task-priority ${task.priority}">${task.priority}</span>
                            ${task.dueDate ? `<span>${Utils.formatDate(task.dueDate)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            // Add click listeners for task checkboxes
            tasksContainer.querySelectorAll('.task-checkbox').forEach(checkbox => {
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const taskItem = checkbox.closest('.task-item');
                    const taskId = taskItem.dataset.id;
                    Tasks.toggleComplete(taskId);
                    this.openDetailModal(projectId); // Refresh
                });
            });
        }

        // Edit button
        document.getElementById('editProjectBtn').onclick = () => {
            this.closeDetailModal();
            this.openModal(project);
        };

        // Delete button
        document.getElementById('deleteProjectBtn').onclick = () => {
            this.delete(projectId);
        };

        // Add task button
        document.getElementById('addTaskToProject').onclick = () => {
            this.closeDetailModal();
            Tasks.openModal(null, projectId);
        };

        modal.classList.add('active');
    },

    closeDetailModal() {
        DOM.projectDetailModal.classList.remove('active');
    }
};

// ============================================
// TASKS MODULE
// ============================================

const Tasks = {
    init() {
        AppState.tasks = Utils.loadFromStorage('tasks') || this.getSampleData();

        DOM.newTaskBtn.addEventListener('click', () => this.openModal());
        DOM.taskForm.addEventListener('submit', (e) => this.handleSubmit(e));

        document.querySelectorAll('#taskModal .modal-close, #taskModal .modal-cancel, #taskModal .modal-overlay').forEach(el => {
            el.addEventListener('click', () => this.closeModal());
        });

        // Initialize drag and drop
        this.initDragAndDrop();
    },

    getSampleData() {
        const projectIds = AppState.projects.map(p => p.id);
        
        return [
            {
                id: Utils.generateId(),
                name: 'Design homepage mockup',
                description: 'Create wireframes and high-fidelity mockups',
                projectId: projectIds[0],
                priority: 'high',
                status: 'in-progress',
                dueDate: '2024-03-15',
                createdAt: new Date().toISOString()
            },
            {
                id: Utils.generateId(),
                name: 'Set up database schema',
                description: 'Design and implement PostgreSQL schema',
                projectId: projectIds[0],
                priority: 'high',
                status: 'done',
                dueDate: '2024-03-10',
                createdAt: new Date().toISOString()
            },
            {
                id: Utils.generateId(),
                name: 'Implement user authentication',
                description: 'JWT-based auth with refresh tokens',
                projectId: projectIds[0],
                priority: 'medium',
                status: 'todo',
                dueDate: '2024-03-20',
                createdAt: new Date().toISOString()
            },
            {
                id: Utils.generateId(),
                name: 'Create API documentation',
                description: 'Document all REST endpoints',
                projectId: projectIds[1],
                priority: 'low',
                status: 'todo',
                dueDate: '2024-03-25',
                createdAt: new Date().toISOString()
            },
            {
                id: Utils.generateId(),
                name: 'Write unit tests',
                description: 'Achieve 80% code coverage',
                projectId: projectIds[1],
                priority: 'medium',
                status: 'review',
                dueDate: '2024-03-18',
                createdAt: new Date().toISOString()
            }
        ];
    },

    openModal(task = null, preselectedProjectId = null) {
        AppState.editingTask = task;
        const modal = DOM.taskModal;
        const title = document.getElementById('taskModalTitle');
        
        // Populate project dropdown
        const projectSelect = document.getElementById('taskProject');
        projectSelect.innerHTML = AppState.projects.map(p => 
            `<option value="${p.id}">${p.name}</option>`
        ).join('');

        if (task) {
            title.textContent = 'Edit Task';
            document.getElementById('taskName').value = task.name;
            document.getElementById('taskProject').value = task.projectId;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskDue').value = task.dueDate;
            document.getElementById('taskDescription').value = task.description || '';
        } else {
            title.textContent = 'New Task';
            DOM.taskForm.reset();
            if (preselectedProjectId) {
                projectSelect.value = preselectedProjectId;
            }
        }

        modal.classList.add('active');
    },

    closeModal() {
        DOM.taskModal.classList.remove('active');
        AppState.editingTask = null;
        DOM.taskForm.reset();
    },

    handleSubmit(e) {
        e.preventDefault();

        const taskData = {
            name: document.getElementById('taskName').value,
            projectId: document.getElementById('taskProject').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDue').value,
            description: document.getElementById('taskDescription').value
        };

        if (AppState.editingTask) {
            const index = AppState.tasks.findIndex(t => t.id === AppState.editingTask.id);
            if (index !== -1) {
                AppState.tasks[index] = { ...AppState.tasks[index], ...taskData };
                Activities.add('updated', `Updated task "${taskData.name}"`);
                Toast.show('Task updated successfully!');
            }
        } else {
            const newTask = {
                id: Utils.generateId(),
                ...taskData,
                status: 'todo',
                createdAt: new Date().toISOString()
            };
            AppState.tasks.unshift(newTask);
            Activities.add('created', `Created new task "${taskData.name}"`);
            Toast.show('Task created successfully!');
        }

        this.save();
        Projects.updateProgress(taskData.projectId);
        this.closeModal();
        Dashboard.render();

        if (AppState.currentView === 'tasks') {
            this.renderKanban();
        }
    },

    toggleComplete(taskId) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = task.status === 'done' ? 'todo' : 'done';
            Activities.add('completed', `${task.status === 'done' ? 'Completed' : 'Reopened'} task "${task.name}"`);
            this.save();
            Projects.updateProgress(task.projectId);
            Dashboard.render();

            if (AppState.currentView === 'tasks') {
                this.renderKanban();
            }
        }
    },

    updateStatus(taskId, newStatus) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) {
            const oldStatus = task.status;
            task.status = newStatus;
            
            if (oldStatus !== newStatus) {
                Activities.add('updated', `Moved task "${task.name}" to ${newStatus.replace('-', ' ')}`);
            }
            
            this.save();
            Projects.updateProgress(task.projectId);
            Dashboard.render();
        }
    },

    save() {
        Utils.saveToStorage('tasks', AppState.tasks);
    },

    renderUpcoming() {
        const upcomingTasks = AppState.tasks
            .filter(t => t.status !== 'done')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);

        if (upcomingTasks.length === 0) {
            DOM.upcomingTasks.innerHTML = `
                <div class="empty-state" style="padding: 30px;">
                    <p>No upcoming tasks</p>
                </div>
            `;
            return;
        }

        DOM.upcomingTasks.innerHTML = upcomingTasks.map(task => {
            const project = AppState.projects.find(p => p.id === task.projectId);
            return `
                <div class="task-item" data-id="${task.id}">
                    <div class="task-checkbox ${task.status === 'done' ? 'checked' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                    </div>
                    <div class="task-content">
                        <span class="task-title">${task.name}</span>
                        <div class="task-meta">
                            <span class="task-priority ${task.priority}">${task.priority}</span>
                            <span>${project ? project.name : 'No project'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click listeners
        DOM.upcomingTasks.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const taskItem = checkbox.closest('.task-item');
                const taskId = taskItem.dataset.id;
                this.toggleComplete(taskId);
            });
        });
    },

    renderKanban() {
        const columns = ['todo', 'in-progress', 'review', 'done'];
        
        columns.forEach(status => {
            const columnTasks = AppState.tasks.filter(t => t.status === status);
            const container = document.querySelector(`.column-tasks[data-status="${status}"]`);
            const countEl = document.querySelector(`.kanban-column[data-status="${status}"] .column-count`);
            
            countEl.textContent = columnTasks.length;

            if (columnTasks.length === 0) {
                container.innerHTML = '<div class="empty-state" style="padding: 20px; font-size: 0.85rem;">No tasks</div>';
                return;
            }

            container.innerHTML = columnTasks.map(task => {
                const project = AppState.projects.find(p => p.id === task.projectId);
                return `
                    <div class="kanban-task" data-id="${task.id}" draggable="true">
                        <div class="kanban-task-title">${task.name}</div>
                        <div class="kanban-task-meta">
                            <span class="kanban-task-project">${project ? project.name : 'No project'}</span>
                            <span class="task-priority ${task.priority}">${task.priority}</span>
                        </div>
                    </div>
                `;
            }).join('');
        });

        this.initDragAndDrop();
    },

    initDragAndDrop() {
        const tasks = document.querySelectorAll('.kanban-task');
        const columns = document.querySelectorAll('.column-tasks');

        tasks.forEach(task => {
            task.addEventListener('dragstart', (e) => {
                task.classList.add('dragging');
                e.dataTransfer.setData('text/plain', task.dataset.id);
            });

            task.addEventListener('dragend', () => {
                task.classList.remove('dragging');
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = column.dataset.status;
                
                this.updateStatus(taskId, newStatus);
                this.renderKanban();
            });
        });
    }
};

// ============================================
// ACTIVITIES MODULE
// ============================================

const Activities = {
    init() {
        AppState.activities = Utils.loadFromStorage('activities') || [];
    },

    add(type, message) {
        const activity = {
            id: Utils.generateId(),
            type,
            message,
            timestamp: new Date().toISOString()
        };

        AppState.activities.unshift(activity);
        
        // Keep only last 50 activities
        if (AppState.activities.length > 50) {
            AppState.activities = AppState.activities.slice(0, 50);
        }

        this.save();
        this.render();
    },

    save() {
        Utils.saveToStorage('activities', AppState.activities);
    },

    render() {
        const recentActivities = AppState.activities.slice(0, 10);

        if (recentActivities.length === 0) {
            DOM.activityList.innerHTML = `
                <div class="empty-state" style="padding: 30px;">
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        const icons = {
            created: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
            updated: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
            completed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
            deleted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
        };

        DOM.activityList.innerHTML = recentActivities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    ${icons[activity.type] || icons.updated}
                </div>
                <div class="activity-content">
                    <p class="activity-text">${activity.message}</p>
                    <span class="activity-time">${Utils.formatRelativeTime(activity.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }
};

// ============================================
// DASHBOARD MODULE
// ============================================

const Dashboard = {
    render() {
        // Update stats
        const totalProjects = AppState.projects.length;
        const completedProjects = AppState.projects.filter(p => p.status === 'completed').length;
        const activeProjects = AppState.projects.filter(p => p.status === 'active').length;
        const totalTasks = AppState.tasks.length;

        this.animateValue(DOM.totalProjects, totalProjects);
        this.animateValue(DOM.completedProjects, completedProjects);
        this.animateValue(DOM.inProgress, activeProjects);
        this.animateValue(DOM.totalTasks, totalTasks);

        // Render sections
        Projects.renderRecent();
        Tasks.renderUpcoming();
        Activities.render();
    },

    animateValue(element, endValue) {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 500;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart);
            
            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }
};

// ============================================
// ANALYTICS MODULE
// ============================================

const Analytics = {
    render() {
        this.renderProgressChart();
        this.renderStatusChart();
        this.renderCategoryChart();
    },

    renderProgressChart() {
        const container = document.getElementById('progressChart');
        const projects = AppState.projects.slice(0, 6);

        if (projects.length === 0) {
            container.innerHTML = '<div class="chart-placeholder">No data available</div>';
            return;
        }

        container.innerHTML = `
            <div class="bar-chart">
                ${projects.map(p => `
                    <div class="bar-group">
                        <div class="bar" style="height: ${Math.max(p.progress, 5)}%; background: linear-gradient(180deg, ${p.color}, ${p.color}88)"></div>
                        <span class="bar-label">${p.name.substring(0, 10)}${p.name.length > 10 ? '...' : ''}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderStatusChart() {
        const container = document.getElementById('statusChart');
        const statuses = {
            todo: AppState.tasks.filter(t => t.status === 'todo').length,
            'in-progress': AppState.tasks.filter(t => t.status === 'in-progress').length,
            review: AppState.tasks.filter(t => t.status === 'review').length,
            done: AppState.tasks.filter(t => t.status === 'done').length
        };

        const total = Object.values(statuses).reduce((a, b) => a + b, 0);
        
        if (total === 0) {
            container.innerHTML = '<div class="chart-placeholder">No tasks available</div>';
            return;
        }

        const colors = {
            todo: '#64748b',
            'in-progress': '#f59e0b',
            review: '#8b5cf6',
            done: '#10b981'
        };

        let currentAngle = 0;
        const segments = Object.entries(statuses).map(([status, count]) => {
            const angle = (count / total) * 360;
            const segment = { status, count, startAngle: currentAngle, endAngle: currentAngle + angle, color: colors[status] };
            currentAngle += angle;
            return segment;
        });

        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 30px; height: 100%;">
                <div class="donut-chart" style="background: conic-gradient(${segments.map(s => `${s.color} ${s.startAngle}deg ${s.endAngle}deg`).join(', ')})"></div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${segments.map(s => `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${s.color}"></div>
                            <span style="font-size: 0.85rem; color: var(--text-secondary); text-transform: capitalize;">${s.status.replace('-', ' ')}: ${s.count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderCategoryChart() {
        const container = document.getElementById('categoryChart');
        const categories = {};
        
        AppState.projects.forEach(p => {
            categories[p.category] = (categories[p.category] || 0) + 1;
        });

        const total = Object.values(categories).reduce((a, b) => a + b, 0);
        
        if (total === 0) {
            container.innerHTML = '<div class="chart-placeholder">No projects available</div>';
            return;
        }

        const colors = {
            web: '#6366f1',
            mobile: '#10b981',
            design: '#ec4899',
            marketing: '#f59e0b',
            other: '#64748b'
        };

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px; padding: 10px 0;">
                ${Object.entries(categories).map(([cat, count]) => {
                    const percentage = Math.round((count / total) * 100);
                    return `
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="font-size: 0.9rem; text-transform: capitalize;">${Utils.getCategoryLabel(cat)}</span>
                                <span style="font-size: 0.85rem; color: var(--text-tertiary);">${count} (${percentage}%)</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percentage}%; background: ${colors[cat] || colors.other}"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
};

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

const Search = {
    init() {
        DOM.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    },

    handleSearch(query) {
        if (!query.trim()) {
            Dashboard.render();
            return;
        }

        const lowerQuery = query.toLowerCase();
        
        const matchingProjects = AppState.projects.filter(p => 
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery)
        );

        const matchingTasks = AppState.tasks.filter(t =>
            t.name.toLowerCase().includes(lowerQuery)
        );

        // For now, just show matching projects in recent section
        if (matchingProjects.length > 0) {
            DOM.recentProjects.innerHTML = matchingProjects.slice(0, 4).map(p => Projects.renderCard(p)).join('');
            Projects.attachCardListeners();
        } else {
            DOM.recentProjects.innerHTML = `
                <div class="empty-state">
                    <p>No projects match "${query}"</p>
                </div>
            `;
        }
    }
};

// ============================================
// APPLICATION INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    Theme.init();
    Projects.init();
    Tasks.init();
    Activities.init();
    Navigation.init();
    Search.init();

    // Render dashboard
    Dashboard.render();

    // Update greeting based on time
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 17) greeting = 'Good Evening';
    
    const greetingEl = document.querySelector('.view-header h1');
    if (greetingEl && greetingEl.textContent.includes('Good Morning')) {
        greetingEl.textContent = `${greeting}, Maseeroh! 👋`;
    }

    console.log('Portfolio Manager initialized successfully!');
});
