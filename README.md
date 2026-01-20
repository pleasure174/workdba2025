# Authentication and Authorization Example

This is a simple Node.js application demonstrating authentication and authorization using Express, JWT, and role-based access control with MySQL database.

## Setup

1. Ensure MySQL is installed and running locally.
2. Create a database named `auth_db` (or update `dbConfig` in server.js).
3. Install dependencies:

   ```
   npm install
   ```

4. Run the server:
   ```
   npm start
   ```

The server will run on http://localhost:3000 and automatically create the users table with sample data.

## Usage

### Login

Send a POST request to `/login` with JSON body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Or for user:

```json
{
  "username": "user",
  "password": "user123"
}
```

Response will include a JWT token.

### Protected Routes

Use the token in the Authorization header as `Bearer <token>`

- GET `/protected` - Requires authentication
- GET `/admin` - Requires admin role
- GET `/user` - Requires user or admin role

## Sample Users

- Admin: username `admin`, password `admin123`, role `admin`
- User: username `user`, password `user123`, role `user`
