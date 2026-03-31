# Employee Management System - Technical Documentation

This document outlines the architecture, technology stack, and setup instructions for the Employee Management System (EMS) project.

---

## 1. Technology Stack

- **Backend**: Node.js with Express.js setup for RESTful API routing.
- **Database**: SQLite3 (Local, lightweight, relational database).
- **Frontend**: Vanilla HTML5, CSS3, and modern standard JavaScript (ES6+).
- **Authentication**: JWT (JSON Web Tokens) for securing endpoints, and `bcryptjs` for hashing user passwords securely.

---

## 2. Installation & Quick Start

### Prerequisites
- Node.js installed (v14+ recommended)
- Optional: DB Browser for SQLite to manually inspect the `database.sqlite` file.

### Setup Instructions
1. Open a terminal (CMD, PowerShell, etc.).
2. Navigate to the project directory: `cd c:\Users\user\OneDrive\Documents\Dashboard\employee-management-system`
3. Install dependencies by running:
   ```bash
   npm install
   ```
   *(Ensure `bcryptjs`, `cors`, `express`, `jsonwebtoken`, and `sqlite3` are installed based on `package.json`)*
4. Start the server:
   ```bash
   node server.js
   ```
5. Open your web browser and navigate to `http://localhost:3000`.

---

## 3. Architecture & API Structure

The system uses a unified monolithic architecture where the Express.js server handles both API requests and static file serving for the frontend UI.

### Key Directories
- `server.js`: The central server file handling initialization, database SQLite setup, JWT middleware, and API endpoints.
- `/public/`: Contains all static frontend assets.
  - `index.html`: The Single Page Application (SPA) layout containing all views (hidden/shown via CSS).
  - `/css/styles.css`: All styling, implementing responsive variables and glassmorphic designs.
  - `/js/app.js`: The central frontend logic handling DOM manipulation, state management, and API calls via `fetch()`.

### API Endpoints
All API endpoints are prefixed with `/api`. Authentication is required for most endpoints except Login and Registration.

**Authentication:**
- `POST /api/register` - Registers a new user. Expects `name`, `email`, `password`, `department`, `position`.
- `POST /api/login` - Authenticates user. Returns a JWT token.

**Profile & Users:**
- `GET /api/profile` - Returns logged-in user profile.
- `PUT /api/profile` - Updates user profile details.
- `GET /api/users` - (Admin Only) Returns a list of all employees.

**Attendance:**
- `POST /api/attendance/punch-in` - Logs a punch-in for the current date.
- `POST /api/attendance/punch-out` - Logs a punch-out for the current date.
- `GET /api/attendance` - Fetches history (User-specific for Employees, All for Admins).

**Leaves:**
- `POST /api/leaves/apply` - Creates a pending leave request.
- `GET /api/leaves` - Fetches leave history.
- `PUT /api/leaves/approve` - (Admin Only) Changes leave status and dynamically deducts balances.

**Tasks:**
- `POST /api/tasks` - (Admin Only) Assigns a new task to an employee.
- `GET /api/tasks` - Fetches tasks.
- `PUT /api/tasks/:id/status` - Updates the progress status of a task.

---

## 4. Database Schema

The SQLite database (`database.sqlite`) initializes automatically on server start if it doesn't exist. It contains four primary tables:

1. **`users` Table**:
   - `id`, `name`, `email` (UNIQUE), `password` (Hashed), `role` (`admin` or `employee`), `department`, `position`, `join_date`, `leave_balance`, `phone`.
2. **`attendance` Table**:
   - `id`, `user_id` (Foreign Key), `date`, `punch_in`, `punch_out`, `status`.
3. **`leaves` Table**:
   - `id`, `user_id` (Foreign Key), `start_date`, `end_date`, `reason`, `status`, `approved_at`.
4. **`tasks` Table**:
   - `id`, `user_id` (Foreign Key), `title`, `description`, `status`, `priority`, `due_date`.

---

## 5. Security Protocols

- **Passwords**: Never stored in plain text. Hashed immediately on the backend using `bcryptjs`.
- **Authorization Flow**: The server issues a JWT token expiring in 24 hours upon successful login. The frontend stores this token in `localStorage` and appends it to the `Authorization: Bearer <token>` header for all authenticated requests.
- **Role-based Access Control (RBAC)**: Enforced via the `requireAdmin` middleware on administrative endpoints (e.g., approving leaves, viewing all users).

---

## 6. Future Enhancements & Scaling

To scale up from this MVP in the future, the following improvements are recommended:
1. **Migration to PostgreSQL/MySQL**: Switch from SQLite to a robust external relational database to handle high concurrency.
2. **React/Vue Implementation**: Break down the monolithic `/js/app.js` file into a component-based frontend framework for better long-term maintainability.
3. **Automated Testing**: Implement testing suites using Jest or Mocha/Chai to cover API endpoints and frontend logic.
