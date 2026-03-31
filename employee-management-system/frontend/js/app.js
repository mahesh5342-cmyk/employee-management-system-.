document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = null;
    let currentToken = localStorage.getItem('ems_token');

    // --- DOM Elements ---
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const signupForm = document.getElementById('signup-form');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const contentViews = document.querySelectorAll('.content-view');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    
    // User Display
    const userNameDisplay = document.getElementById('user-name-display');
    const userRoleBadge = document.getElementById('user-role-badge');
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    const employeeOnlyElements = document.querySelectorAll('.employee-only');
    
    // Summary Cards Elements
    const empSummary = document.querySelector('.employee-summary');
    const adminSummary = document.querySelector('.admin-summary');
    
    // API Base URL
    const API_URL = '/api';

    // --- Initialization ---
    if (currentToken) {
        fetchProfile();
    }

    // --- Event Listeners ---
    document.getElementById('link-show-signup')?.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        authTitle.textContent = 'Create Account';
        authSubtitle.textContent = 'Sign up for a new employee account';
    });

    document.getElementById('link-show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        authTitle.textContent = 'EMS Portal';
        authSubtitle.textContent = 'Sign in to your account';
    });
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button');
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Login failed');
            
            localStorage.setItem('ems_token', data.token);
            currentToken = data.token;
            currentUser = data.user;
            
            loginError.textContent = '';
            showDashboard();
        } catch (err) {
            loginError.textContent = err.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });

    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const department = document.getElementById('signup-department').value;
        const position = document.getElementById('signup-position').value;
        
        const submitBtn = signupForm.querySelector('button');
        const errorDiv = document.getElementById('signup-error');
        const successDiv = document.getElementById('signup-success');
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
            errorDiv.textContent = '';
            successDiv.textContent = '';
            
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, department, position })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Registration failed');
            
            successDiv.textContent = 'Registration successful! Switching to login...';
            signupForm.reset();
            
            setTimeout(() => {
                successDiv.textContent = '';
                document.getElementById('link-show-login').click();
                document.getElementById('email').value = email; // Pre-fill login email
            }, 1500);
            
        } catch (err) {
            errorDiv.textContent = err.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    });

    function handleLogout() {
        localStorage.removeItem('ems_token');
        currentToken = null;
        currentUser = null;
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }

    logoutBtn.addEventListener('click', handleLogout);
    
    const headerLogoutBtn = document.getElementById('header-logout-btn');
    if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', handleLogout);

    // Navigation switching
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.getAttribute('data-view');
            switchView(targetView);
            
            // Close mobile sidebar on click
            if(window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Dashboard Actions
    document.getElementById('btn-punch-in').addEventListener('click', () => handlePunch('punch-in'));
    document.getElementById('btn-punch-out').addEventListener('click', () => handlePunch('punch-out'));

    // Universal Modal Closer
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
        });
    });

    const leaveModal = document.getElementById('leave-modal');
    document.getElementById('btn-apply-leaveModal')?.addEventListener('click', () => leaveModal.classList.add('show'));

    // Assign Task Modal
    const assignTaskModal = document.getElementById('assign-task-modal');
    document.getElementById('btn-assign-taskModal')?.addEventListener('click', async () => {
        assignTaskModal.classList.add('show');
        const empSelect = document.getElementById('task-emp');
        empSelect.innerHTML = '<option value="">Loading...</option>';
        try {
            const users = await fetchWithAuth(`${API_URL}/users`);
            empSelect.innerHTML = '<option value="">Select Employee</option>';
            users.filter(u => u.role !== 'admin').forEach(u => {
                empSelect.innerHTML += `<option value="${u.id}">${u.name} (${u.department || 'No Dept'})</option>`;
            });
        } catch(e) { console.error(e); }
    });

    document.getElementById('assign-task-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user_id = document.getElementById('task-emp').value;
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-desc').value;
        const due_date = document.getElementById('task-due').value;
        const priority = document.getElementById('task-priority').value;
        const msg = document.getElementById('task-msg');
        
        try {
            await fetchWithAuth(`${API_URL}/tasks`, {
                method: 'POST',
                body: JSON.stringify({ user_id, title, description, due_date, priority })
            });
            assignTaskModal.classList.remove('show');
            document.getElementById('assign-task-form').reset();
            loadTasks();
            msg.textContent = '';
        } catch(err) {
            msg.textContent = err.message;
        }
    });

    // Dashboard Cards clicks
    const leaveBalanceCard = document.getElementById('emp-leave-balance-card');
    if (leaveBalanceCard) {
        leaveBalanceCard.addEventListener('click', () => {
            document.getElementById('modal-leaves-rem').textContent = currentUser.leave_balance;
            document.getElementById('modal-leaves-taken').textContent = 20 - currentUser.leave_balance;
            document.getElementById('leave-balance-modal').classList.add('show');
        });
    }

    const adminTotalEmpCard = document.getElementById('admin-total-emp-card');
    if (adminTotalEmpCard) {
        adminTotalEmpCard.addEventListener('click', async () => {
            const modal = document.getElementById('total-employees-modal');
            modal.classList.add('show');
            const tbody = document.getElementById('total-employees-modal-body');
            const countSpan = document.getElementById('modal-total-emp-count');
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
            
            try {
                const data = await fetchWithAuth(`${API_URL}/users`);
                tbody.innerHTML = '';
                countSpan.textContent = data.length || 0;
                
                if(data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No employees found</td></tr>';
                    return;
                }
                data.forEach(emp => {
                    const designation = emp.position || emp.role || '-';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${emp.name}</td><td>${emp.email}</td><td>${emp.department || '-'}</td><td>${designation}</td>`;
                    tbody.appendChild(tr);
                });
            } catch(e) {
                console.error(e);
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load employees</td></tr>';
            }
        });
    }

    const approvedLeavesCard = document.getElementById('emp-approved-leaves-card');
    if (approvedLeavesCard) {
        approvedLeavesCard.addEventListener('click', async () => {
            const leavesModal = document.getElementById('approved-leaves-modal');
            leavesModal.classList.add('show');
            const tbody = document.getElementById('approved-leaves-modal-body');
            tbody.innerHTML = '<tr><td colspan="2">Loading...</td></tr>';
            
            try {
                const data = await fetchWithAuth(`${API_URL}/leaves`);
                const approved = data.filter(l => l.status === 'approved');
                tbody.innerHTML = '';
                if(approved.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="2">No approved leaves yet</td></tr>';
                    return;
                }
                approved.forEach(l => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${l.start_date} to ${l.end_date}</td><td>${l.approved_at || 'Unknown'}</td>`;
                    tbody.appendChild(tr);
                });
            } catch(e) {
                console.error(e);
            }
        });
    }

    // Profile Update Modal Setup
    const profileUpdateModal = document.getElementById('profile-update-modal');
    document.getElementById('btn-update-profileModal')?.addEventListener('click', () => {
        document.getElementById('profile-name').value = currentUser.name || '';
        document.getElementById('profile-dept').value = currentUser.department || '';
        document.getElementById('profile-pos').value = currentUser.position || '';
        document.getElementById('profile-phone').value = currentUser.phone || '';
        
        // Uncheck all
        ['name', 'dept', 'pos', 'phone'].forEach(f => {
            document.getElementById(`check-${f}`).checked = false;
            document.getElementById(`profile-${f}`).disabled = true;
        });
        
        profileUpdateModal.classList.add('show');
    });

    ['name', 'dept', 'pos', 'phone'].forEach(f => {
        const checkbox = document.getElementById(`check-${f}`);
        const input = document.getElementById(`profile-${f}`);
        if(checkbox && input) {
            checkbox.addEventListener('change', (e) => {
                input.disabled = !e.target.checked;
            });
        }
    });
    
    document.getElementById('leave-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const start_date = document.getElementById('leave-start').value;
        const end_date = document.getElementById('leave-end').value;
        const reason = document.getElementById('leave-reason').value;

        try {
            const res = await fetchWithAuth(`${API_URL}/leaves/apply`, {
                method: 'POST',
                body: JSON.stringify({ start_date, end_date, reason })
            });
            if (res.message) {
                leaveModal.classList.remove('show');
                document.getElementById('leave-form').reset();
                loadLeaves();
                loadSummary(); // to update pending status
            }
        } catch(err) {
            alert(err.message);
        }
    });

    // Profile form
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Read values if checked, else keep current
        const name = document.getElementById('check-name').checked ? document.getElementById('profile-name').value : currentUser.name;
        const department = document.getElementById('check-dept').checked ? document.getElementById('profile-dept').value : currentUser.department;
        const position = document.getElementById('check-pos').checked ? document.getElementById('profile-pos').value : currentUser.position;
        const phone = document.getElementById('check-phone').checked ? document.getElementById('profile-phone').value : currentUser.phone;
        
        const profileMsg = document.getElementById('profile-msg');

        try {
            await fetchWithAuth(`${API_URL}/profile`, {
                method: 'PUT',
                body: JSON.stringify({ name, department, position, phone })
            });
            profileMsg.textContent = "Profile updated successfully!";
            profileMsg.className = "text-success mt-2";
            
            // Update local state
            currentUser.name = name;
            currentUser.department = department;
            currentUser.position = position;
            currentUser.phone = phone;
            
            userNameDisplay.textContent = `Welcome, ${currentUser.name}`;
            populateProfile(); // refresh display
            
            setTimeout(() => {
                profileMsg.textContent = '';
                document.getElementById('profile-update-modal').classList.remove('show');
            }, 1500);
        } catch(err) {
            profileMsg.textContent = err.message;
            profileMsg.className = "text-danger mt-2";
        }
    });

    // --- Core Functions ---

    async function fetchWithAuth(url, options = {}) {
        if (!currentToken) throw new Error('No token');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
            ...options.headers
        };
        
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                logoutBtn.click(); // Auto logout on invalid token
            }
            throw new Error(data.error || 'API Error');
        }
        return data;
    }

    async function fetchProfile() {
        try {
            const user = await fetchWithAuth(`${API_URL}/profile`);
            currentUser = user;
            showDashboard();
        } catch (err) {
            console.error('Profile fetch failed:', err);
            localStorage.removeItem('ems_token');
        }
    }

    function showDashboard() {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        
        // Setup UI based on role
        userNameDisplay.textContent = `Welcome, ${currentUser.name}`;
        userRoleBadge.textContent = currentUser.role === 'admin' ? 'Administrator' : 'Employee';
        userRoleBadge.className = currentUser.role === 'admin' ? 'badge badge-danger' : 'badge badge-primary';

        if(currentUser.role === 'admin') {
            adminOnlyElements.forEach(el => el.classList.remove('hidden'));
            employeeOnlyElements.forEach(el => el.classList.add('hidden'));
            adminSummary.classList.remove('hidden');
            empSummary.classList.add('hidden');
        } else {
            adminOnlyElements.forEach(el => el.classList.add('hidden'));
            employeeOnlyElements.forEach(el => el.classList.remove('hidden'));
            adminSummary.classList.add('hidden');
            empSummary.classList.remove('hidden');
        }

        switchView('dashboard');
    }

    function switchView(viewId) {
        // Update nav styling
        navItems.forEach(item => {
            if (item.getAttribute('data-view') === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Toggle content views
        contentViews.forEach(view => {
            if (view.id === `view-${viewId}`) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        });

        // Load data specific to the view
        if (viewId === 'dashboard') {
            loadSummary();
            checkDeadlines();
        }
        if (viewId === 'tasks') loadTasks();
        if (viewId === 'attendance') loadAttendance();
        if (viewId === 'leaves') loadLeaves();
        if (viewId === 'profile') populateProfile();
        if (viewId === 'admin-panel' && currentUser.role === 'admin') loadEmployees();
    }

    // --- Data Loading Functions ---

    async function checkDeadlines() {
        if(!currentUser || currentUser.role === 'admin') return;
        try {
            const data = await fetchWithAuth(`${API_URL}/tasks`);
            const alertsContainer = document.getElementById('dashboard-alerts');
            if(!alertsContainer) return;
            alertsContainer.innerHTML = '';
            
            const now = new Date();
            now.setHours(0,0,0,0);
            
            const pendingTasks = data.filter(t => t.status !== 'completed' && t.due_date);
            
            pendingTasks.forEach(task => {
                const dueDate = new Date(task.due_date);
                const diffTime = dueDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 2 && diffDays >= 0) {
                    alertsContainer.innerHTML += `
                        <div class="card glass-panel flex-between" style="border-left: 4px solid var(--warning-color); padding: 1rem; margin-bottom: 1rem;">
                            <div><strong>Upcoming Deadline:</strong> Task "${task.title}" is due in ${diffDays} day(s) on ${task.due_date}.</div>
                            <span class="badge badge-warning">Due Soon</span>
                        </div>
                    `;
                } else if (diffDays < 0) {
                    alertsContainer.innerHTML += `
                        <div class="card glass-panel flex-between" style="border-left: 4px solid var(--danger-color); padding: 1rem; margin-bottom: 1rem;">
                            <div><strong>Overdue Alert:</strong> Task "${task.title}" was due on ${task.due_date}!</div>
                            <span class="badge badge-danger">Overdue</span>
                        </div>
                    `;
                }
            });
        } catch(e) { console.error('Deadline check error', e); }
    }

    async function loadTasks() {
        try {
            const data = await fetchWithAuth(`${API_URL}/tasks`);
            const tbody = document.getElementById('tasks-table-body');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center">No tasks found</td></tr>`;
                return;
            }

            data.forEach(task => {
                const tr = document.createElement('tr');
                let statusBadge = 'badge-warning';
                if(task.status === 'completed') statusBadge = 'badge-success';
                else if(task.status === 'in-progress') statusBadge = 'badge-primary';
                
                let priorityBadge = 'badge-primary';
                if(task.priority === 'High') priorityBadge = 'badge-danger';
                if(task.priority === 'Low') priorityBadge = 'badge-success';
                
                const adminCol = currentUser.role === 'admin' ? `<td>${task.user_name}</td>` : '';

                tr.innerHTML = `
                    ${adminCol}
                    <td>${task.title}</td>
                    <td>${task.description || '-'}</td>
                    <td><span class="badge ${priorityBadge}">${task.priority || 'Medium'}</span></td>
                    <td>${task.due_date || '-'}</td>
                    <td><span class="badge ${statusBadge}">${task.status}</span></td>
                    <td>
                        <select class="form-select status-select" data-id="${task.id}" style="padding: 0.3rem; border-radius: 4px; border: 1px solid #d1d5db;">
                            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Add change listener to selects
            document.querySelectorAll('.status-select').forEach(sel => {
                sel.addEventListener('change', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const status = e.target.value;
                    try {
                        await fetchWithAuth(`${API_URL}/tasks/${id}/status`, {
                            method: 'PUT',
                            body: JSON.stringify({ status })
                        });
                        loadTasks(); // refresh
                    } catch (err) {
                        alert(err.message);
                    }
                });
            });
        } catch(err) {
            console.error('Tasks error:', err);
        }
    }

    async function loadSummary() {
        try {
            const data = await fetchWithAuth(`${API_URL}/dashboard/summary`);
            if (currentUser.role === 'admin') {
                document.getElementById('admin-total-emp').textContent = data.total_employees;
                document.getElementById('admin-pending-leaves').textContent = data.pending_leaves;
                document.getElementById('admin-present-today').textContent = data.present_today;
            } else {
                document.getElementById('emp-today-status').textContent = data.today_status;
                document.getElementById('emp-today-status').className = data.today_status === 'Present' ? 'status-text text-success' : 'status-text text-warning';
                document.getElementById('emp-leave-balance').textContent = `${data.leave_balance} Days`;
                document.getElementById('emp-approved-leaves').textContent = data.approved_leaves;
                
                // Update punch buttons logic
                const punchMsg = document.getElementById('punch-message');
                const btnIn = document.getElementById('btn-punch-in');
                const btnOut = document.getElementById('btn-punch-out');
                
                if (!data.today_record) {
                    btnIn.disabled = false;
                    btnOut.disabled = true;
                    punchMsg.textContent = "You haven't punched in today.";
                } else if (!data.today_record.punch_out) {
                    btnIn.disabled = true;
                    btnOut.disabled = false;
                    punchMsg.textContent = `Punched in at ${data.today_record.punch_in}`;
                } else {
                    btnIn.disabled = true;
                    btnOut.disabled = true;
                    punchMsg.textContent = `Shift completed. In: ${data.today_record.punch_in}, Out: ${data.today_record.punch_out}`;
                }
            }
        } catch(err) {
            console.error('Summary error:', err);
        }
    }

    async function loadAttendance() {
        try {
            const data = await fetchWithAuth(`${API_URL}/attendance`);
            const tbody = document.getElementById('attendance-table-body');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center">No attendance records found</td></tr>`;
                return;
            }

            const today = new Date().toISOString().split('T')[0];

            data.forEach(record => {
                const tr = document.createElement('tr');
                const adminCol = currentUser.role === 'admin' ? `<td>${record.user_name}</td>` : '';
                
                let punchOutDisplay = `<span class="badge badge-warning">${record.punch_out || '--:--'}</span>`;
                if (!record.punch_out && record.date < today) {
                    punchOutDisplay = `<span class="badge badge-danger" title="Forgot to punch out">Missed Punch Out</span>`;
                }

                tr.innerHTML = `
                    ${adminCol}
                    <td>${record.date}</td>
                    <td><span class="badge badge-success">${record.punch_in || '--:--'}</span></td>
                    <td>${punchOutDisplay}</td>
                    <td>${record.status}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch(err) {
            console.error('Attendance error:', err);
        }
    }

    async function loadLeaves() {
        try {
            const data = await fetchWithAuth(`${API_URL}/leaves`);
            const tbody = document.getElementById('leaves-table-body');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center">No leave requests found</td></tr>`;
                return;
            }

            data.forEach(leave => {
                const tr = document.createElement('tr');
                const adminCol = currentUser.role === 'admin' ? `<td>${leave.user_name}</td>` : '';
                
                let statusBadge = 'badge-warning';
                if(leave.status === 'approved') statusBadge = 'badge-success';
                if(leave.status === 'rejected') statusBadge = 'badge-danger';

                let actionCol = '';
                if(currentUser.role === 'admin') {
                    if (leave.status === 'pending') {
                        actionCol = `
                            <td>
                                <button class="btn btn-success action-btn" onclick="updateLeave(${leave.id}, 'approved')"><i class="fas fa-check"></i></button>
                                <button class="btn btn-danger-outline action-btn" onclick="updateLeave(${leave.id}, 'rejected')"><i class="fas fa-times"></i></button>
                            </td>
                        `;
                    } else {
                        actionCol = `<td>-</td>`;
                    }
                }

                tr.innerHTML = `
                    ${adminCol}
                    <td>${leave.start_date}</td>
                    <td>${leave.end_date}</td>
                    <td>${leave.reason}</td>
                    <td><span class="badge ${statusBadge}">${leave.status}</span></td>
                    ${actionCol}
                `;
                tbody.appendChild(tr);
            });
        } catch(err) {
            console.error('Leaves error:', err);
        }
    }

    async function loadEmployees() {
        if(currentUser.role !== 'admin') return;
        try {
            const data = await fetchWithAuth(`${API_URL}/users`);
            const tbody = document.getElementById('employees-table-body');
            tbody.innerHTML = '';
            
            data.forEach(emp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${emp.id}</td>
                    <td>${emp.name} ${emp.role === 'admin' ? '<i class="fas fa-shield-alt text-primary"></i>' : ''}</td>
                    <td>${emp.email}</td>
                    <td>${emp.department || '-'}</td>
                    <td>${emp.leave_balance}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch(err) {
            console.error('Employees load error:', err);
        }
    }

    function populateProfile() {
        if (!currentUser) return;
        document.getElementById('display-name').textContent = currentUser.name || '-';
        document.getElementById('display-email').textContent = currentUser.email || '-';
        document.getElementById('display-dept').textContent = currentUser.department || '-';
        document.getElementById('display-pos').textContent = currentUser.position || '-';
        document.getElementById('display-phone').textContent = currentUser.phone || '-';
    }

    async function handlePunch(action) {
        try {
            const res = await fetchWithAuth(`${API_URL}/attendance/${action}`, { method: 'POST' });
            if (res.message) {
                // Refresh dashboard card
                loadSummary();
            }
        } catch(err) {
            alert(err.message);
        }
    }

    // Export function to global scope for onclick handlers
    window.updateLeave = async function(id, status) {
        try {
            const res = await fetchWithAuth(`${API_URL}/leaves/approve`, {
                method: 'PUT',
                body: JSON.stringify({ leave_id: id, status })
            });
            if (res.message) {
                loadLeaves(); // refresh
            }
        } catch(err) {
            alert(err.message);
        }
    };
});
