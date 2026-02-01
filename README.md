# Internal Polling Management System - Backend

##  Project Overview
The Internal Polling Management System Backend is a robust API designed to handle organizational polling and voting processes. It provides features for user management, secure role-based access control, poll creation, and real-time voting results. The system ensures integrity by enforcing a one-vote-per-user policy per poll and a role-acceptance security layer.

---

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **ODM:** Mongoose
- **Authentication:** JSON Web Tokens (JWT) & HTTP-only Cookies
- **Security:** Bcrypt for password hashing
- **Email Service:** Nodemailer

---

## User Roles and Permissions

| Role | Permissions |
| :--- | :--- |
| **Admin** | Full system access. Create/Edit/Delete polls, Manage users, Update roles, View all results. |
| **User** | Access active polls, Cast a single vote per poll, View own voting history. |
| **Reviewer** | View results and poll status (permissions extendable based on requirements). |

> **Note:** All users (including Admins) must have their role accepted (`isrRoleAccepted: true`) before accessing protected routes.

---

## API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Execution Format |
| :--- | :--- | :--- | :--- |
| `POST` | `/login` | User login | `POST` `/api/v1/auth/login`<br>Body: `{"email":"...", "password":"..."}` |
| `POST` | `/register-admin` | Register an admin | `POST` `/api/v1/auth/register-admin`<br>Body: `{"name":"...", "email":"...", "adminCode":"..."}` |
| `GET` | `/me` | Get current user | `GET` `/api/v1/auth/me` |
| `GET` | `/logout` | Logout user | `GET` `/api/v1/auth/logout` |
| `GET` | `/role-setup/:id` | Accept user role (Public Link) | `GET` `/api/v1/auth/role-setup/{userId}` |
| `PUT` | `/setup-role/:id` | User role setup (Auth Required) | `PUT` `/api/v1/auth/setup-role/{userId}` |
| `GET` | `/all-users` | Get all users (Admin) | `GET` `/api/v1/auth/all-users` |
| `PUT` | `/update-role/:id` | Update user role (Admin) | `PUT` `/api/v1/auth/update-role/{userId}`<br>Body: `{"role":"admin"}` |
| `DELETE` | `/delete-user/:id` | Delete user (Admin) | `DELETE` `/api/v1/auth/delete-user/{userId}` |

### Admin Specifics (`/api/v1/admin`)

| Method | Endpoint | Description | Execution Format |
| :--- | :--- | :--- | :--- |
| `POST` | `/create-user` | Direct user creation | `POST` `/api/v1/admin/create-user`<br>Body: `{"name":"...", "email":"..."}` |

### Poll Management (`/api/v1/polls`)

| Method | Endpoint | Description | Execution Format |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Create a poll (Admin) | `POST` `/api/v1/polls/`<br>Body: `{"title":"...", "options":["A", "B"]}` |
| `GET` | `/` | Get all polls (Admin) | `GET` `/api/v1/polls/` |
| `GET` | `/active` | Get active polls | `GET` `/api/v1/polls/active` |
| `GET` | `/:id` | Get poll by ID | `GET` `/api/v1/polls/{pollId}` |
| `GET` | `/:id/results` | Get poll results | `GET` `/api/v1/polls/{pollId}/results` |
| `PUT` | `/:id/toggle` | Toggle poll status | `PUT` `/api/v1/polls/{pollId}/toggle` |

### Voting (`/api/v1/votes`)

| Method | Endpoint | Description | Execution Format |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Cast a vote | `POST` `/api/v1/votes/`<br>Body: `{"pollId":"...", "optionId":"..."}` |
| `GET` | `/my-votes` | Get voting history | `GET` `/api/v1/votes/my-votes` |
| `GET` | `/status/:pollId`| Check vote status | `GET` `/api/v1/votes/status/{pollId}` |
| `GET` | `/poll/:pollId` | Get all votes (Admin) | `GET` `/api/v1/votes/poll/{pollId}` |

---

## Database Schema

### User Schema
- `name`: String
- `email`: String (Unique)
- `password`: String (Hashed)
- `phone`: Number
- `role`: String (Enum: `['user', 'admin', 'reviewer']`)
- `isrRoleAccepted`: Boolean (Default: `false`)

### Poll Schema
- `title`: String (Required, 3-200 chars)
- `description`: String (Max 1000 chars)
- `options`: Array
  - `optionText`: String
  - `votes`: Number
- `isActive`: Boolean (Default: `true`)
- `createdBy`: ObjectId (Ref: User)

### Vote Schema
- `pollId`: ObjectId (Ref: Poll)
- `userId`: ObjectId (Ref: User)
- `optionId`: ObjectId

---

## Live Deployment Links
- **Backend API:** [https://internal-polling-management-system-back-tbps.onrender.com](https://internal-polling-management-system-back-tbps.onrender.com)

---

## Local Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables (.env):**
   ```env
   PORT=8080
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   ADMIN_CODE=your_secret_admin_code
   EMAIL_USER=your_email
   EMAIL_PASS=your_email_password
   ```
4. **Run the server:**
   ```bash
   npm run dev
   ```

