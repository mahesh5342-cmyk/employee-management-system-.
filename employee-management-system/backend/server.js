const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-key-ems';

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite Database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'employee',
            department TEXT,
            position TEXT,
            join_date TEXT,
            leave_balance INTEGER DEFAULT 20
        )`);

        // Attendance Table
        db.run(`CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            punch_in TEXT,
            punch_out TEXT,
            status TEXT DEFAULT 'present',
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Leaves Table
        db.run(`CREATE TABLE IF NOT EXISTS leaves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            approved_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Tasks Table
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'Medium',
            due_date TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);
        
        // Safely alter existing tables to add new columns if they don't exist
        db.run("ALTER TABLE users ADD COLUMN phone TEXT", () => {});
        db.run("ALTER TABLE leaves ADD COLUMN approved_at TEXT", () => {});
        db.run("ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'Medium'", () => {});

        // Create Admin user if none exists
        db.get("SELECT * FROM users WHERE role = 'admin'", async (err, row) => {
            if (!row) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                const joinDate = new Date().toISOString().split('T')[0];
                db.run("INSERT INTO users (name, email, password, role, department, position, join_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    ['Admin User', 'admin@ems.com', hashedPassword, 'admin', 'Management', 'System Administrator', joinDate]);
            }
        });

        // Create a test employee user if none exists
        db.get("SELECT * FROM users WHERE role = 'employee'", async (err, row) => {
            if (!row) {
                const hashedPassword = await bcrypt.hash('employee123', 10);
                const joinDate = new Date().toISOString().split('T')[0];
                db.run("INSERT INTO users (name, email, password, role, department, position, join_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    ['Test Employee', 'employee@ems.com', hashedPassword, 'employee', 'Engineering', 'Software Engineer', joinDate]);
            }
        });
    });
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// --- API Routes ---

// Register / Signup
app.post('/api/register', async (req, res) => {
    const { name, email, password, department, position } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, existingUser) => {
        if (err) return res.status(500).json({ error: err.message });
        if (existingUser) return res.status(400).json({ error: 'User with this email already exists' });

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const joinDate = new Date().toISOString().split('T')[0];
            
            db.run("INSERT INTO users (name, email, password, role, department, position, join_date, leave_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [name, email, hashedPassword, 'employee', department || '', position || '', joinDate, 20], 
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(201).json({ message: 'User registered successfully', id: this.lastID });
                }
            );
        } catch (hashError) {
            res.status(500).json({ error: 'Password hashing failed' });
        }
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
    });
});

// Profile
app.get('/api/profile', authenticateToken, (req, res) => {
    db.get("SELECT id, name, email, role, department, position, join_date, leave_balance, phone FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(user);
    });
});

app.put('/api/profile', authenticateToken, (req, res) => {
    const { name, department, position, phone } = req.body;
    db.run("UPDATE users SET name = ?, department = ?, position = ?, phone = ? WHERE id = ?", 
        [name, department, position, phone, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Profile updated successfully' });
    });
});

// Users (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
    db.all("SELECT id, name, email, role, department, position, join_date, leave_balance FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Attendance Management
app.post('/api/attendance/punch-in', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toISOString().split('T')[1].substring(0, 5); // HH:MM

    db.get("SELECT * FROM attendance WHERE user_id = ? AND date = ?", [req.user.id, today], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        if (record) {
            return res.status(400).json({ error: 'Already punched in for today' });
        }
        
        db.run("INSERT INTO attendance (user_id, date, punch_in) VALUES (?, ?, ?)", 
            [req.user.id, today, time], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Punch in successful', id: this.lastID, punch_in: time });
        });
    });
});

app.post('/api/attendance/punch-out', authenticateToken, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toISOString().split('T')[1].substring(0, 5);

    db.get("SELECT * FROM attendance WHERE user_id = ? AND date = ?", [req.user.id, today], (err, record) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!record) return res.status(400).json({ error: 'No punch-in record found for today' });
        if (record.punch_out) return res.status(400).json({ error: 'Already punched out for today' });

        db.run("UPDATE attendance SET punch_out = ? WHERE id = ?", [time, record.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Punch out successful', punch_out: time });
        });
    });
});

app.get('/api/attendance', authenticateToken, (req, res) => {
    if (req.user.role === 'admin') {
        db.all("SELECT a.*, u.name as user_name FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY a.date DESC LIMIT 50", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        db.all("SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC", [req.user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

// Leave Management
app.post('/api/leaves/apply', authenticateToken, (req, res) => {
    const { start_date, end_date, reason } = req.body;
    db.run("INSERT INTO leaves (user_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)", 
        [req.user.id, start_date, end_date, reason], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Leave application submitted successfully', id: this.lastID });
    });
});

app.get('/api/leaves', authenticateToken, (req, res) => {
    if (req.user.role === 'admin') {
        db.all("SELECT l.*, u.name as user_name FROM leaves l JOIN users u ON l.user_id = u.id ORDER BY l.id DESC", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        db.all("SELECT * FROM leaves WHERE user_id = ? ORDER BY id DESC", [req.user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

app.put('/api/leaves/approve', authenticateToken, requireAdmin, (req, res) => {
    const { leave_id, status } = req.body; // status: 'approved' or 'rejected'
    const approvedAt = status === 'approved' ? new Date().toISOString().split('T')[0] : null;

    db.run("UPDATE leaves SET status = ?, approved_at = ? WHERE id = ?", [status, approvedAt, leave_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // If approved, we can calculate days and deduct from leave_balance
        if (status === 'approved') {
            db.get("SELECT * FROM leaves WHERE id = ?", [leave_id], (err, leave) => {
                if (leave) {
                    const start = new Date(leave.start_date);
                    const end = new Date(leave.end_date);
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    db.run("UPDATE users SET leave_balance = leave_balance - ? WHERE id = ?", [days, leave.user_id]);
                }
            });
        }
        
        res.json({ message: 'Leave status updated successfully' });
    });
});

// Tasks Management
app.post('/api/tasks', authenticateToken, requireAdmin, (req, res) => {
    const { user_id, title, description, due_date, priority } = req.body;
    db.run("INSERT INTO tasks (user_id, title, description, due_date, priority) VALUES (?, ?, ?, ?, ?)", 
        [user_id, title, description, due_date, priority || 'Medium'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Task assigned successfully', id: this.lastID });
    });
});

app.get('/api/tasks', authenticateToken, (req, res) => {
    if (req.user.role === 'admin') {
        db.all("SELECT t.*, u.name as user_name FROM tasks t JOIN users u ON t.user_id = u.id ORDER BY t.due_date ASC", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        db.all("SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC", [req.user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

app.put('/api/tasks/:id/status', authenticateToken, (req, res) => {
    const { status } = req.body;
    // only the assigned user or admin can update
    db.run("UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?", [status, req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(403).json({ error: 'Not authorized or task not found' });
        res.json({ message: 'Task status updated' });
    });
});

// Dashboard Summary API
app.get('/api/dashboard/summary', authenticateToken, (req, res) => {
    const data = {};
    if (req.user.role === 'admin') {
        // Find total employees, total leaves pending, today's attendance
        const today = new Date().toISOString().split('T')[0];
        db.get("SELECT COUNT(*) as count FROM users WHERE role = 'employee'", [], (err, row) => {
            data.total_employees = row ? row.count : 0;
            db.get("SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'", [], (err, row) => {
                data.pending_leaves = row ? row.count : 0;
                db.get("SELECT COUNT(*) as count FROM attendance WHERE date = ?", [today], (err, row) => {
                    data.present_today = row ? row.count : 0;
                    res.json(data);
                });
            });
        });
    } else {
        // Find leave balance, total leaves taken, attendance stats
        db.get("SELECT leave_balance FROM users WHERE id = ?", [req.user.id], (err, row) => {
            data.leave_balance = row ? row.leave_balance : 0;
            db.get("SELECT COUNT(*) as count FROM leaves WHERE user_id = ? AND status = 'approved'", [req.user.id], (err, row) => {
                data.approved_leaves = row ? row.count : 0;
                
                // Attendance Summary: total presents vs absents logic (simplified)
                db.all("SELECT status, COUNT(*) as count FROM attendance WHERE user_id = ? GROUP BY status", [req.user.id], (err, rows) => {
                    data.attendance_stats = rows || [];
                    
                    // today status
                    const today = new Date().toISOString().split('T')[0];
                    db.get("SELECT * FROM attendance WHERE user_id = ? AND date = ?", [req.user.id, today], (err, record) => {
                        data.today_status = record ? 'Present' : 'Not Punched In';
                        data.today_record = record;
                        res.json(data);
                    });
                });
            });
        });
    }
});


// Catch-all route to serve index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
