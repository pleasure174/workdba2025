const express = require("express");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const { auth, authorize } = require("./middleware/auth");

const app = express();
app.use(express.json());

// MySQL connection
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "auth_db",
};

let db;

(async () => {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL");

    // Create users table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      )
    `);

    // Insert sample users if not exist
    const [rows] = await db.execute("SELECT COUNT(*) as count FROM users");
    if (rows[0].count === 0) {
      const hashedAdmin = bcrypt.hashSync("admin123", 8);
      const hashedUser = bcrypt.hashSync("user123", 8);
      await db.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?), (?, ?, ?)",
        ["admin", hashedAdmin, "admin", "user", hashedUser, "user"],
      );
      console.log("Sample users inserted");
    }
  } catch (err) {
    console.error("Database connection failed:", err);
  }
})();

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ id: user.id, role: user.role }, "secretkey", {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// Protected route (requires authentication)
app.get("/protected", auth, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

// Admin-only route (requires authentication and admin role)
app.get("/admin", auth, authorize(["admin"]), (req, res) => {
  res.json({ message: "Admin only access", user: req.user });
});

// User route (requires authentication and user or admin role)
app.get("/user", auth, authorize(["user", "admin"]), (req, res) => {
  res.json({ message: "User access", user: req.user });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
