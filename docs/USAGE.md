# Usage Guide

## Getting Started

### Prerequisites

- Node.js (v14+)
- MySQL (for production) or use in-memory database for testing
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/pleasure174/workdba2025.git
cd workdba2025
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET if needed
```

### Running the Application

**Development Mode (with MySQL):**

```bash
npm start
```

Server starts on `http://localhost:3000`

**Test Mode (in-memory database):**

```bash
NODE_ENV=test npm test
```

---

## Common Workflows

### 1. Register a New User

**Request:**

```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securepass123",
    "role": "customer"
  }'
```

**Response:**

```json
{
  "message": "User registered successfully"
}
```

---

### 2. Login and Get Token

**Request:**

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiXXJvbGUiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAzNjAwfQ.signature"
}
```

---

### 3. Access Profile (Authenticated)

**Request:**

```bash
curl -X GET http://localhost:3000/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**

```json
{
  "message": "User profile",
  "user": {
    "id": 1,
    "role": "admin"
  }
}
```

---

### 4. Add a Product (Admin Only)

**Request:**

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "name": "Chocolate Croissant",
    "category": "Pastries",
    "price": 550.00,
    "quantity": 150
  }'
```

**Response:**

```json
{
  "message": "Product added successfully"
}
```

---

### 5. Search and Filter Products

**Request:**

```bash
curl -X GET "http://localhost:3000/products?category=Breads&minPrice=1000&sortBy=price&order=ASC"
```

**Response:**

```json
[
  {
    "id": 1,
    "name": "Whole Wheat Bread",
    "category": "Breads",
    "price": 1200.5,
    "quantity": 95
  },
  {
    "id": 2,
    "name": "White Sliced Bread",
    "category": "Breads",
    "price": 1000.0,
    "quantity": 48
  }
]
```

---

### 6. Place an Order

**Request:**

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "items": [
      {
        "productId": 1,
        "quantity": 2
      },
      {
        "productId": 3,
        "quantity": 3
      }
    ],
    "deliveryLocation": "Kigali, Rwanda"
  }'
```

**Response:**

```json
{
  "message": "Order placed successfully",
  "orderId": 1
}
```

---

### 7. View Admin Reports

**Request:**

```bash
curl -X GET http://localhost:3000/admin/reports \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**

```json
{
  "summary": {
    "totalSales": 5410.0,
    "orderCount": 2
  },
  "inventory": [
    {
      "name": "Whole Wheat Bread",
      "quantity": 93
    },
    {
      "name": "White Sliced Bread",
      "quantity": 47
    }
  ],
  "lowStockAlerts": [
    {
      "name": "Croissant",
      "quantity": 8
    }
  ]
}
```

---

## Using Postman

1. Import the API endpoints into Postman
2. Create an environment with:
   - `base_url`: `http://localhost:3000`
   - `token`: (will be populated after login)

3. **Login Request** - Copy token from response
4. **Set Global Variable:**
   - In login request, add a test:

   ```javascript
   pm.environment.set("token", pm.response.json().token);
   ```

5. Use `{{token}}` in Authorization header for protected endpoints

---

## Testing

Run the complete test suite:

```bash
npm test
```

Run specific test:

```bash
npm test -- --grep "should allow /profile with valid token"
```

**Test Coverage:**

- User registration with validation
- Login authentication
- Protected route access
- Role-based authorization
- Token expiration
- Product management
- Order processing
- Admin reports

---

## Database

### Test Environment

- In-memory database (automatically initialized)
- No external dependencies required
- Data cleared between test runs

### Production Environment

- MySQL database
- Tables auto-created on first run
- Sample data seeded if database is empty

### Sample Data

**Users:**

- Admin: `admin` / `admin123`
- User: `user` / `user123`
- Customer: `customer` / `customer123`

**Products:**

- Whole Wheat Bread (100 qty)
- White Sliced Bread (50 qty)
- Chocolate Chip Cookie (200 qty)
- Croissant (80 qty)

---

## Configuration

### Environment Variables (.env)

```env
JWT_SECRET=your_secret_key_here
NODE_ENV=test|production
```

### Database Configuration

Edit `server.js` to change MySQL connection:

```javascript
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "auth_db",
};
```

---

## Security Notes

⚠️ **Important:**

1. Change default passwords in production
2. Use strong JWT_SECRET (>32 characters)
3. Enable HTTPS in production
4. Store `.env` securely (never commit)
5. Validate all user inputs
6. Use role-based access control strictly

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Database Connection Error

```bash
# Check MySQL is running
# Verify credentials in .env
# Ensure auth_db exists or set create permission
```

### Invalid Token Error

- Token may be expired (valid for 1 hour)
- JWT_SECRET mismatch between server and client
- Token format incorrect (missing "Bearer " prefix)

---

## API Rate Limiting

Not implemented. Add middleware if needed:

```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);
```

---

## Support

For issues or questions:

1. Check API documentation in `docs/API.md`
2. Review test cases in `test/login.test.js`
3. Check console logs for error details
4. Verify credentials and token validity

---

## License

MIT
