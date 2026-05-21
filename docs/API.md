# API Documentation

## Authentication & Authorization System

Complete REST API for user authentication, authorization, product management, and order processing with role-based access control.

---

## Base URL

```
http://localhost:3000
```

---

## Authentication

All protected endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Register User

**POST** `/register`

Create a new user account.

**Request Body:**

```json
{
  "username": "newuser",
  "password": "securepass123",
  "role": "customer"
}
```

**Response (201 Created):**

```json
{
  "message": "User registered successfully"
}
```

**Error Cases:**

- `400 Bad Request` - Missing username or password
- `409 Conflict` - Username already exists
- `500 Server Error` - Database error

---

### 2. Login

**POST** `/login`

Authenticate and receive a JWT token.

**Request Body:**

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

- `400 Bad Request` - Missing username or password
- `401 Unauthorized` - Invalid credentials
- `500 Server Error` - Database error

---

### 3. Get Profile

**GET** `/profile`

Retrieve authenticated user's profile.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "User profile",
  "user": {
    "id": 1,
    "role": "admin"
  }
}
```

**Error Cases:**

- `403 Forbidden` - No token provided
- `401 Unauthorized` - Invalid/expired token

---

### 4. Protected Route

**GET** `/protected`

Requires authentication only.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "This is a protected route",
  "user": {
    "id": 1,
    "role": "user"
  }
}
```

---

### 5. Admin Route

**GET** `/admin`

Admin-only access.

**Headers:**

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

- `403 Forbidden` - Non-admin user
- `401 Unauthorized` - Invalid token

---

### 6. User Route

**GET** `/user`

User and admin access.

**Headers:**

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

---

### 7. Customer Route

**GET** `/customer`

Customer, user, and admin access.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "Customer access",
  "user": {
    "id": 3,
    "role": "customer"
  }
}
```

---

### 8. Create Product

**POST** `/products`

Add a new product (admin only).

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "name": "Whole Wheat Bread",
  "category": "Breads",
  "price": 1200.5,
  "quantity": 100
}
```

**Response (201 Created):**

```json
{
  "message": "Product added successfully"
}
```

---

### 9. Get Products

**GET** `/products`

Retrieve all products with optional filtering, sorting.

**Query Parameters:**

- `category` - Filter by category
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `sortBy` - Sort field (`name`, `price`, `quantity`)
- `order` - Sort order (`ASC` or `DESC`)

**Example:**

```
GET /products?category=Breads&minPrice=1000&sortBy=price&order=ASC
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "name": "Whole Wheat Bread",
    "category": "Breads",
    "price": 1200.5,
    "quantity": 100
  }
]
```

---

### 10. Create Order

**POST** `/orders`

Place a new order (requires authentication).

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 3,
      "quantity": 5
    }
  ],
  "deliveryLocation": "Gitega Sector, Nyarugenge"
}
```

**Response (201 Created):**

```json
{
  "message": "Order placed successfully",
  "orderId": 1
}
```

**Error Cases:**

- `400 Bad Request` - No items or insufficient stock
- `500 Server Error` - Order processing failed

---

### 11. Admin Reports

**GET** `/admin/reports`

Generate sales and inventory reports (admin only).

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "summary": {
    "totalSales": 12500.5,
    "orderCount": 5
  },
  "inventory": [
    {
      "name": "Whole Wheat Bread",
      "quantity": 95
    }
  ],
  "lowStockAlerts": [
    {
      "name": "Croissant",
      "quantity": 5
    }
  ]
}
```

---

## HTTP Status Codes

| Code  | Meaning                              |
| ----- | ------------------------------------ |
| `200` | OK - Request successful              |
| `201` | Created - Resource created           |
| `400` | Bad Request - Invalid input          |
| `401` | Unauthorized - Invalid/expired token |
| `403` | Forbidden - Access denied            |
| `409` | Conflict - Resource exists           |
| `500` | Server Error - Database error        |

---

## Error Response Format

All errors return JSON:

```json
{
  "message": "Error description"
}
```

---

## Role-Based Access Control (RBAC)

| Endpoint             | Admin | User | Customer | Public |
| -------------------- | ----- | ---- | -------- | ------ |
| `/register`          | ✓     | ✓    | ✓        | ✓      |
| `/login`             | ✓     | ✓    | ✓        | ✓      |
| `/profile`           | ✓     | ✓    | ✓        | ✗      |
| `/protected`         | ✓     | ✓    | ✓        | ✗      |
| `/admin`             | ✓     | ✗    | ✗        | ✗      |
| `/user`              | ✓     | ✓    | ✗        | ✗      |
| `/customer`          | ✓     | ✓    | ✓        | ✗      |
| `POST /products`     | ✓     | ✗    | ✗        | ✗      |
| `GET /products`      | ✓     | ✓    | ✓        | ✓      |
| `POST /orders`       | ✓     | ✓    | ✓        | ✗      |
| `GET /admin/reports` | ✓     | ✗    | ✗        | ✗      |

---

## Sample Users

| Username   | Password      | Role     |
| ---------- | ------------- | -------- |
| `admin`    | `admin123`    | admin    |
| `user`     | `user123`     | user     |
| `customer` | `customer123` | customer |
