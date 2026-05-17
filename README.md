# TaskFlow – Team Task Manager

A full-stack collaborative task management web application built with React, Node.js, Express, and MongoDB.

## 🚀 Live Demo

> Add your live Railway URL here after deployment

## ✨ Features

- **Authentication** – Secure JWT-based signup/login
- **Projects** – Create projects, invite team members by email, manage colors
- **Tasks** – Create tasks with title, description, due date, and priority; assign to members; track status
- **Role-Based Access**
  - **Admin**: Full CRUD on tasks, manage project members, delete project
  - **Member**: View & update status of assigned tasks only
- **Dashboard** – Real-time stats: total tasks, in progress, done, overdue; team workload; per-project progress
- **Responsive dark UI** built with Tailwind CSS

## 🛠 Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, React Router 6, Tailwind CSS  |
| Backend    | Node.js, Express.js                     |
| Database   | MongoDB + Mongoose ODM                  |
| Auth       | JWT (jsonwebtoken) + bcryptjs           |
| Deployment | Railway                                 |

## 📁 Project Structure

```
task-manager/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── controllers/          # Business logic
│   │   │   ├── authController.js
│   │   │   ├── projectController.js
│   │   │   ├── taskController.js
│   │   │   └── dashboardController.js
│   │   ├── middleware/auth.js    # JWT middleware
│   │   ├── models/               # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Project.js
│   │   │   └── Task.js
│   │   ├── routes/               # Express routes
│   │   └── index.js              # Entry point
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/Layout.jsx # Sidebar + outlet
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Projects.jsx
    │   │   ├── ProjectDetail.jsx
    │   │   └── Tasks.jsx
    │   ├── utils/api.js          # Axios instance
    │   └── App.jsx               # Routes
    └── package.json
```

## ⚙️ Local Development Setup

### Prerequisites
- Node.js 18+
- MongoDB (local) or MongoDB Atlas account

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/task-manager.git
cd task-manager
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev   # Runs on http://localhost:5000
```

### 3. Frontend setup
```bash
cd frontend
npm install
# No .env needed for local dev (uses Vite proxy)
npm run dev   # Runs on http://localhost:5173
```

## 🌐 Deployment on Railway

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/task-manager.git
git push -u origin main
```

### Step 2: Deploy Backend
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `task-manager` repo → choose the `backend` folder (or use monorepo root path setting)
3. Add environment variables:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_random_secret_here
   FRONTEND_URL=https://your-frontend.railway.app
   NODE_ENV=production
   ```
4. Railway auto-detects Node.js and runs `npm start`

### Step 3: Deploy Frontend
1. New Service → same repo → `frontend` folder
2. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
3. Railway builds with `npm run build` and serves the `dist/` folder

### Step 4: Connect them
- Copy backend Railway URL → set as `VITE_API_URL` in frontend service
- Copy frontend Railway URL → set as `FRONTEND_URL` in backend service
- Redeploy both services

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/projects` | List user's projects | Any |
| POST | `/api/projects` | Create project | Any |
| GET | `/api/projects/:id` | Get project | Member+ |
| PUT | `/api/projects/:id` | Update project | Admin |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST | `/api/projects/:id/members` | Add member by email | Admin |
| DELETE | `/api/projects/:id/members/:uid` | Remove member | Admin |

### Tasks
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/tasks?project=:id` | List tasks | Admin=all, Member=own |
| POST | `/api/tasks` | Create task | Admin |
| PUT | `/api/tasks/:id` | Update task | Admin=full, Member=status |
| DELETE | `/api/tasks/:id` | Delete task | Admin |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get aggregated stats |

## 🔐 Security Features

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens expire in 7 days
- Role-based middleware on every protected route
- Input validation with express-validator
- MongoDB injection protection via Mongoose

## 📝 Notes for Reviewers

- All API routes are protected with JWT middleware
- Members can only see and update tasks assigned to them
- Admins have full access within their projects
- The app gracefully handles errors with meaningful messages
