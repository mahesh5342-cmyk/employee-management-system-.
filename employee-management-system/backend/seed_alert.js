const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tmrw = d.toISOString().split('T')[0];
    db.run(`INSERT INTO tasks (user_id, title, description, priority, due_date) SELECT id, 'Urgent Equipment Check', 'Verify all workstations before the new hires arrive.', 'High', '${tmrw}' FROM users WHERE role='employee'`);
});
console.log('Seeded urgent task');
