# Employee Management System

A simple, role-based Employee Management System featuring an admin dashboard, attendance tracking, task management, and leave management.

## Project Structure

This project has been cleanly separated into two main directories:

- **/frontend** - Contains all client-side static files (HTML, CSS, JavaScript).
- **/backend** - Contains the Node.js server (`server.js`), the SQLite database, and the backend dependencies.

Also included in the root directory:
- `USER_GUIDE.md` - A manual on how to use the web application from an end-user perspective.
- `TECHNICAL_DOCUMENTATION.md` - Technical details regarding the database schema, models, and endpoints.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or above recommended)
- npm (Node Package Manager)

## Getting Started

Follow these instructions to set up and run the project locally.

### 1. Terminal / Command Prompt
Open your terminal and ensure you are in the root directory of the project (`employee-management-system`).

### 2. Navigate to the Backend directory
Since the project relies on a Node server to launch, all operations are done from the `backend` container:
```bash
cd backend
```

### 3. Install Dependencies
Install all required Node.js packages (Express, SQLite3, etc.):
```bash
npm install
```

### 4. Run the Application
Finally, start your local server:
```bash
node server.js
```

### 5. Accessing the App
The server will start locally on port 3000. Open your web browser and navigate to:
```
http://localhost:3000
```
This is for testing new branch creation