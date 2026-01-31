# Internal Polling Management System - Backend

A robust REST API for managing internal polls with role-based access control and JWT authentication.

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Environment Variables**: dotenv

## 👥 User Roles and Permissions

### USER Role
- Register and login to the system
- View all active polls
- Cast votes in polls (one vote per poll)
- View own voting history
- View poll results

### ADMIN Role
- All USER permissions
- Create new polls with multiple options
- View all polls (including inactive)
- Update poll details
- Toggle poll active/inactive status
- Delete polls
- View all votes for any poll
- Manage users (create, update role, delete)

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: Number,
  role: String (enum: ['user', 'admin']),
  resettoken: String,
  resettokenexpiry: Date,
  profilePic: String,
  isrRoleAccepted: Boolean,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Polls Collection
```javascript
{
  _id: ObjectId,
  title: String (required, 3-200 chars),
  description: String (max 1000 chars),
  options: [{
    optionText: String (required),
    votes: Number (default: 0)
  }],
  isActive: Boolean (default: true),
  createdBy: ObjectId (ref: User),
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Votes Collection
```javascript
{
  _id: ObjectId,
  pollId: ObjectId (ref: Poll),
  userId: ObjectId (ref: User),
  optionId: ObjectId,
  createdAt: DateTime,
  updatedAt: DateTime
}
// UNIQUE INDEX on (pollId, userId) - enforces one vote per user per poll
```

## 🔌 API Endpoints

### Authentication Routes (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user (use adminCode for admin) |
| POST | `/register-admin` | Public | Register admin (requires admin code) |
| POST | `/login` | Public | Login user/admin |
| GET | `/logout` | Protected | Logout current user |
| GET | `/me` | Protected | Get current user details |
| GET | `/all-users` | Admin | Get all users |
| GET | `/get-all-admin` | Admin | Get all admins |
| GET | `/get-user/:id` | Admin | Get specific user |
| PUT | `/update-role/:id` | Admin | Update user role |
| DELETE | `/delete-user/:id` | Admin | Delete user |

### Poll Routes (`/api/v1/polls`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Admin | Create new poll |
| GET | `/` | Admin | Get all polls (including inactive) |
| GET | `/active` | Protected | Get all active polls |
| GET | `/:id` | Protected | Get poll by ID with vote status |
| GET | `/:id/results` | Protected | Get poll results |
| PUT | `/:id` | Admin | Update poll |
| DELETE | `/:id` | Admin | Delete poll and associated votes |
| PATCH | `/:id/toggle` | Admin | Toggle poll active status |

### Vote Routes (`/api/v1/votes`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Protected | Cast a vote |
| GET | `/my-votes` | Protected | Get user's voting history |
| GET | `/status/:pollId` | Protected | Check if user voted in poll |
| GET | `/poll/:pollId` | Admin | Get all votes for a poll |

### Admin Routes (`/api/v1/admin`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/create-user` | Admin | Create new user |

## 🔒 Business Rules

### Critical Constraint: One Vote Per Poll
- Each user can vote **only once** per poll
- Enforced at database level with unique compound index on `(pollId, userId)`
- Additional validation in application logic
- Duplicate vote attempts return 400 error with clear message

### Poll Visibility
- Only **active** polls are visible to regular users
- Admins can see all polls regardless of status

### Vote Persistence
- All votes are stored in the database
- Vote counts are calculated dynamically from the database
- No hardcoded or in-memory storage

## 🛠️ Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=8080
MONGO_URI=your_mongodb_connection_string
ADMIN_CODE=your_secret_admin_code
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Run Production Server

```bash
npm start
```

## 📝 API Request Examples

### Register User
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": 1234567890
}
```

### Register Admin
```bash
POST /api/v1/auth/register-admin
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "adminPassword123",
  "adminCode": "1234"
}
```

### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### Create Poll (Admin)
```bash
POST /api/v1/polls
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Favorite Programming Language",
  "description": "Vote for your favorite language",
  "options": ["JavaScript", "Python", "Java", "Go"]
}
```

### Cast Vote
```bash
POST /api/v1/votes
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "pollId": "poll_id_here",
  "optionId": "option_id_here"
}
```

### Get Poll Results
```bash
GET /api/v1/polls/:pollId/results
Authorization: Bearer <jwt_token>
```

## 🔐 Authentication

- JWT tokens are generated on login/registration
- Tokens are stored in httpOnly cookies
- Token expiration: 8 hours
- Protected routes require valid JWT token in:
  - Cookie: `token`
  - OR Authorization header: `Bearer <token>`

## ⚠️ Error Handling

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## 🚀 Deployment

### Recommended Platforms
- **Backend**: Railway, Render, Heroku
- **Database**: MongoDB Atlas (free tier available)

### Deployment Steps
1. Push code to GitHub repository
2. Create account on deployment platform
3. Connect GitHub repository
4. Set environment variables
5. Deploy

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Update `FRONTEND_URL` to production URL
- Ensure `MONGO_URI` points to production database

## 📦 Dependencies

```json
{
  "bcrypt": "^6.0.0",
  "cookie-parser": "^1.4.7",
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "express": "^5.2.1",
  "jsonwebtoken": "^9.0.3",
  "mongoose": "^9.1.5",
  "nodemailer": "^7.0.13",
  "nodemon": "^3.1.11"
}
```

## 🧪 Testing

Test the API using:
- **Postman**: Import endpoints and test manually
- **Thunder Client**: VS Code extension
- **curl**: Command-line testing

## 📄 License

ISC

## 👨‍💻 Author

Internal Polling Management System Team

---

**Note**: This is a full-stack assignment project demonstrating authentication, authorization, database persistence, and business rule enforcement.
