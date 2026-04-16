# Smart Restaurant Queue Management System

A full-stack queue management platform for restaurants, built to replace manual waiting lists with a real-time digital workflow.

## What This Project Does

The Smart Restaurant Queue Management System helps restaurants:

- Register walk-in customers into a live queue
- Generate and track token numbers in real time
- Let staff call, skip, and serve customers efficiently
- Manage table availability
- Give admins visibility into operations and settings

## Core Features

- Customer queue registration
- Automatic token generation
- Real-time queue updates via Socket.IO
- Staff panel for queue handling
- Admin panel for management controls
- Table status management
- Queue history and basic analytics support

## Tech Stack

- Frontend: React (Create React App)
- Backend: Node.js + Express
- Real-time: Socket.IO
- Database: PostgreSQL (`pg`)

## Project Structure

```text
Restaurant-Queue-Management/
	backend/                 # Express API + DB setup + sockets
	frontend/
		myapp/                 # React client app
	package.json             # Root scripts (backend start)
```

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm
- PostgreSQL database

### 1. Clone and install dependencies

Install root/backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend/myapp
npm install
cd ../..
```

### 2. Configure environment variables

Create a `.env` file in the project root (or set environment variables in your deployment platform):

```env
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>
PORT=5000
JWT_SECRET=your_jwt_secret_here
```

Notes:

- `DATABASE_URL` is required by `backend/config/database.js`.
- `PORT` is optional (defaults to `5000`).

### 3. Run the backend

From the project root:

```bash
npm start
```

The API will run on `http://localhost:5000` by default.

### 4. Run the frontend

Open another terminal:

```bash
cd frontend/myapp
npm start
```

The React app will run on `http://localhost:3000` by default.

## API Modules

Backend routes are organized by module:

- `/api/auth`
- `/api/queue`
- `/api/staff`
- `/api/table`
- `/api/admin`

## User Roles

- Customer: Join queue, view token, track progress
- Staff: Call next customer, skip/serve tokens, update tables
- Admin: Manage settings, monitor queue operations

## Current Behavior on Startup

When the backend starts, it automatically:

- Creates required database tables if they do not exist
- Seeds default values in `settings` (for example `avg_wait_time`)

## Future Improvements

- Better analytics dashboards and reporting
- SMS/WhatsApp notification integrations
- Reservation + waitlist hybrid workflow
- Role-based access hardening and audit logs

## License

This project is currently marked as `ISC` in `package.json`.
