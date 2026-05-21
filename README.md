# Authentication and Authorization Example

This is a complete Node.js authentication system demonstrating Express, JWT, role-based access control (RBAC), and comprehensive testing.

## Features

✅ **User Registration** - Register new users with optional custom roles  
✅ **Login** - Authenticate users and receive JWT tokens  
✅ **Protected Routes** - Token-based access control  
✅ **Role-Based Authorization** - Admin, User, and custom role support  
✅ **Comprehensive Testing** - 20 test cases covering all functionality  
✅ **Dual Database Support** - MySQL for production, in-memory for testing

## Setup

### Production Environment

1. Copy `.env.example` to `.env` and set `JWT_SECRET`.
2. Ensure MySQL is installed and running locally.
3. Create a database named `auth_db` (or update `dbConfig` in server.js).
4. Install dependencies:

```bash
npm install
```

5. Start the server:

```bash
npm start
```

The server runs on `http://localhost:3000` and automatically creates tables with sample users:

- **Admin**: username `admin`, password `admin123`
- **User**: username `user`, password `user123`

### Testing Environment

Run tests with in-memory database (no MySQL required):

```bash
npm test
```

All 20 tests pass successfully, testing registration, login, protected routes, admin access, user access, and token expiration.

## API Endpoints

### 1. Register (POST `/register`)

Create a new user account.

**Request:**

```json
{
  "username": "newuser",
  "password": "securepass123",
  "role": "user"
}
```

**Response (201 Created):**

```json
{
  "message": "User registered successfully"
}
```

**Error Cases:**

- Missing username or password → 400 Bad Request
- Username already exists → 409 Conflict

### 2. Login (POST `/login`)

Authenticate and receive a JWT token.

**Request:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Cases:**

- Invalid credentials → 401 Unauthorized
- Missing fields → 400 Bad Request

### 3. Protected Route (GET `/protected`)

Access restricted to authenticated users.

**Header:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "This is a protected route",
  "user": {
    "id": 1,
    "role": "admin"
  }
}
```

**Error Cases:**

- Missing token → 403 Forbidden
- Invalid/expired token → 401 Unauthorized

### 4. Admin Route (GET `/admin`)

Access restricted to admin role only.

**Header:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "message": "Admin only access",
  "user": {
    "id": 1,
    "role": "admin"
  }
}
```

**Error Cases:**

- User token (non-admin) → 403 Forbidden

### 5. User Route (GET `/user`)

Access for user and admin roles.

**Header:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "User access",
  "user": {
    "id": 2,
    "role": "user"
  }
}
```

## Authentication Flow

1. **Register** - User creates account via `/register`
2. **Login** - User authenticates via `/login` and receives JWT token
3. **Access** - User includes token in `Authorization: Bearer <token>` header
4. **Authorization** - Middleware verifies token and checks role permissions
5. **Response** - API returns data or access denied based on authorization

## Middleware

### auth.js

**`auth` middleware** - Verifies JWT token validity  
**`authorize(roles)` middleware** - Checks if user role matches allowed roles

## Database Schema

### In-Memory (Test Database)

```javascript
users: [
  { id, username, password (hashed), role }
]
```

### MySQL (Production)

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL
);
```

## Test Coverage

All 20 tests pass:

- ✅ Registration: successful, validation, duplicate username, custom roles
- ✅ Login: admin, user, invalid credentials, missing fields
- ✅ Protected route: access control, token validation
- ✅ Admin route: authorization, role checking
- ✅ User route: access control for users and admins
- ✅ Token expiration: expired token rejection

Run with:

```bash
npm test
```

## Security Notes

⚠️ **Secrets** - Replace hardcoded `secretkey` with environment variable in production  
⚠️ **Passwords** - All passwords hashed with bcryptjs  
⚠️ **Token Expiry** - Tokens expire in 1 hour  
⚠️ **HTTPS** - Use HTTPS in production

## Dependencies

- `express` - Web framework
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation
- `mysql2/promise` - MySQL driver (production only)
- `mocha` - Test runner
- `chai` & `chai-http` - Testing assertions and HTTP requests
- GET `/admin` - Requires admin role
- GET `/user` - Requires user or admin role

## Sample Users

- Admin: username `admin`, password `admin123`, role `admin`
- User: username `user`, password `user123`, role `user`
