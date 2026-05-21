require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const functions = require("firebase-functions");
const { auth, authorize } = require("./middleware/auth");

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const DEFAULT_ROLE = "customer";

let db;
let isTestMode = process.env.NODE_ENV === "test";

// Simple in-memory database for testing
class InMemoryDB {
  constructor() {
    this.users = [];
    this.products = [];
    this.orders = [];
    this.nextId = 1;
    this.nextProductId = 1;
    this.nextOrderId = 1;
  }

  findByUsername(username) {
    return this.users.find((u) => u.username === username);
  }

  findProductById(id) {
    return this.products.find((p) => p.id === parseInt(id));
  }

  addUser(username, password, role) {
    if (this.findByUsername(username)) {
      throw new Error("UNIQUE violation");
    }
    const user = { id: this.nextId++, username, password, role };
    this.users.push(user);
    return user;
  }

  addProduct(name, category, price, quantity) {
    const product = {
      id: this.nextProductId++,
      name,
      category,
      price: parseFloat(price),
      quantity: parseInt(quantity),
    };
    this.products.push(product);
    return product;
  }

  addOrder(order) {
    const newOrder = {
      ...order,
      id: this.nextOrderId++,
      created_at: new Date(),
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  clear() {
    this.users = [];
    this.products = [];
    this.orders = [];
    this.nextId = 1;
    this.nextProductId = 1;
    this.nextOrderId = 1;
  }
}

// Initialize database (in-memory for tests, MySQL for production)
const dbReady = (async () => {
  try {
    if (isTestMode) {
      // Use in-memory database for testing
      db = new InMemoryDB();

      // Insert sample users
      const hashedAdmin = bcrypt.hashSync("admin123", 8);
      const hashedUser = bcrypt.hashSync("user123", 8);
      db.addUser("admin", hashedAdmin, "admin");
      db.addUser("user", hashedUser, "user");

      // Insert sample products for testing/development
      db.addProduct("Whole Wheat Bread", "Breads", 1200.5, 100);
      db.addProduct("White Sliced Bread", "Breads", 1000.0, 50);
      db.addProduct("Chocolate Chip Cookie", "Pastries", 350.0, 200);
      db.addProduct("Croissant", "Pastries", 500.0, 80);

      console.log("In-memory database initialized for testing");
    } else {
      // Production: use MySQL
      const mysql = require("mysql2/promise");
      const dbConfig = {
        host: "localhost",
        user: "root",
        password: "",
      };

      // First, connect without specifying a database to create it if it doesn't exist
      const tempConnection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
      });
      await tempConnection.execute("CREATE DATABASE IF NOT EXISTS auth_db");
      await tempConnection.end(); // Close the temporary connection

      // Now, connect to the specific database
      db = await mysql.createConnection({ ...dbConfig, database: "auth_db" });
      console.log("Connected to MySQL database 'auth_db'");

      // Create users table if not exists
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          quantity INT NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          total_price DECIMAL(10, 2) NOT NULL,
          delivery_location VARCHAR(255),
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // Insert sample users if not exist
      const [rows] = await db.execute("SELECT COUNT(*) as count FROM users");
      if (rows[0].count === 0) {
        const hashedAdmin = bcrypt.hashSync("admin123", 8);
        const hashedUser = bcrypt.hashSync("user123", 8);
        const hashedCustomer = bcrypt.hashSync("customer123", 8);
        await db.execute(
          "INSERT INTO users (username, password, role) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)",
          [
            "admin",
            hashedAdmin,
            "admin",
            "user",
            hashedUser,
            "user",
            "customer",
            hashedCustomer,
            "customer",
          ],
        );
        console.log("Sample users inserted");
      }

      // Fetch sample user IDs for orders
      const [adminUsers] = await db.execute(
        "SELECT id FROM users WHERE username = 'admin'",
      );
      const adminId = adminUsers[0].id;
      const [regularUsers] = await db.execute(
        "SELECT id FROM users WHERE username = 'user'",
      );
      const regularUserId = regularUsers[0].id;

      let wholeWheatBreadId,
        whiteSlicedBreadId,
        chocolateChipCookieId,
        croissantId;
      let wholeWheatBreadPrice = 1200.5;
      let whiteSlicedBreadPrice = 1000.0;
      let chocolateChipCookiePrice = 350.0;
      let croissantPrice = 500.0;

      // Insert sample products if not exist
      const [productCountRows] = await db.execute(
        "SELECT COUNT(*) as count FROM products",
      );
      if (productCountRows[0].count === 0) {
        await db.execute(
          "INSERT INTO products (name, category, price, quantity) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)",
          [
            "Whole Wheat Bread",
            "Breads",
            wholeWheatBreadPrice,
            100,
            "White Sliced Bread",
            "Breads",
            whiteSlicedBreadPrice,
            50,
            "Chocolate Chip Cookie",
            "Pastries",
            chocolateChipCookiePrice,
            200,
            "Croissant",
            "Pastries",
            croissantPrice,
            80,
          ],
        );
        console.log("Sample products inserted");
      }

      // Insert sample orders if not exist
      const [orderCountRows] = await db.execute(
        "SELECT COUNT(*) as count FROM orders",
      );
      if (orderCountRows[0].count === 0) {
        const [p1] = await db.execute(
          "SELECT id FROM products WHERE name = 'Whole Wheat Bread'",
        );
        const [p2] = await db.execute(
          "SELECT id FROM products WHERE name = 'Chocolate Chip Cookie'",
        );

        if (p1.length > 0 && p2.length > 0) {
          const totalPrice =
            2 * wholeWheatBreadPrice + 5 * chocolateChipCookiePrice;
          const [orderResult] = await db.execute(
            "INSERT INTO orders (user_id, total_price, delivery_location) VALUES (?, ?, ?)",
            [regularUserId, totalPrice, "Gitega Sector, Nyarugenge"],
          );
          const orderId = orderResult.insertId;

          await db.execute(
            "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?), (?, ?, ?, ?)",
            [
              orderId,
              p1[0].id,
              2,
              wholeWheatBreadPrice,
              orderId,
              p2[0].id,
              5,
              chocolateChipCookiePrice,
            ],
          );
          console.log("Sample order and items inserted");
        }
      }
    }
    return db;
  } catch (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
})();

// Helper to retrieve the db connection after initialization
const getDb = () => db;

// Register endpoint
app.post("/register", async (req, res) => {
  const { username, password, role = "user" } = req.body;
  try {
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }
    const hashedPassword = bcrypt.hashSync(password, 8);

    if (isTestMode) {
      try {
        db.addUser(username, hashedPassword, role);
      } catch (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(409).json({ message: "Username already exists" });
        }
        throw err;
      }
    } else {
      await db.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        [username, hashedPassword, role],
      );
    }

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username already exists" });
    }
    res.status(500).json({ message: "Database error" });
  }
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    // missing required fields
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }
  try {
    let user;

    if (isTestMode) {
      user = db.findByUsername(username);
    } else {
      const [rows] = await db.execute(
        "SELECT * FROM users WHERE username = ?",
        [username],
      );
      user = rows[0];
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const jwt = require("jsonwebtoken");
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// --- Task 3: Product Management (CRUD) ---
app.post("/products", auth, authorize(["admin"]), async (req, res) => {
  const { name, category, price, quantity } = req.body;
  if (!name || !category || price == null || quantity == null) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    if (isTestMode) {
      db.addProduct(name, category, price, quantity);
    } else {
      await db.execute(
        "INSERT INTO products (name, category, price, quantity) VALUES (?, ?, ?, ?)",
        [name, category, price, quantity],
      );
    }
    res.status(201).json({ message: "Product added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error adding product" });
  }
});

// --- Task 2 & 5: Search, Filter, and Sort ---
app.get("/products", async (req, res) => {
  const {
    category,
    minPrice,
    maxPrice,
    sortBy = "name",
    order = "ASC",
  } = req.query;
  try {
    if (isTestMode) {
      let results = [...db.products];
      if (category) results = results.filter((p) => p.category === category);
      if (minPrice)
        results = results.filter((p) => p.price >= parseFloat(minPrice));
      if (maxPrice)
        results = results.filter((p) => p.price <= parseFloat(maxPrice));
      results.sort((a, b) =>
        order === "DESC"
          ? b[sortBy] > a[sortBy]
            ? 1
            : -1
          : a[sortBy] > b[sortBy]
            ? 1
            : -1,
      );
      return res.json(results);
    }

    let sql = "SELECT * FROM products WHERE 1=1";
    const params = [];
    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }
    if (minPrice) {
      sql += " AND price >= ?";
      params.push(minPrice);
    }
    if (maxPrice) {
      sql += " AND price <= ?";
      params.push(maxPrice);
    }

    const validSortFields = ["name", "price", "quantity"];
    if (validSortFields.includes(sortBy)) {
      sql += ` ORDER BY ${sortBy} ${order.toUpperCase() === "DESC" ? "DESC" : "ASC"}`;
    }

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

// --- Task 4: Orders System ---
app.post("/orders", auth, async (req, res) => {
  const { items, deliveryLocation } = req.body; // items: [{productId, quantity}]
  if (!items || !items.length)
    return res.status(400).json({ message: "Order must have items" });

  try {
    let totalPrice = 0;
    const orderDetails = [];

    // Validation and Inventory Check
    for (const item of items) {
      let product;
      if (isTestMode) {
        product = db.findProductById(item.productId);
      } else {
        const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [
          item.productId,
        ]);
        product = rows[0];
      }

      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product ID ${item.productId}`,
        });
      }
      totalPrice += product.price * item.quantity;
      orderDetails.push({ ...item, unitPrice: product.price });
    }

    if (isTestMode) {
      const order = db.addOrder({
        user_id: req.user.id,
        total_price: totalPrice,
        delivery_location: deliveryLocation,
        items: orderDetails,
      });
      orderDetails.forEach((item) => {
        const p = db.findProductById(item.productId);
        p.quantity -= item.quantity;
      });
      return res
        .status(201)
        .json({ message: "Order placed successfully", orderId: order.id });
    } else {
      const connection = await db;
      // Using transactions for data integrity
      await connection.beginTransaction();
      try {
        const [orderResult] = await connection.execute(
          "INSERT INTO orders (user_id, total_price, delivery_location) VALUES (?, ?, ?)",
          [req.user.id, totalPrice, deliveryLocation],
        );
        const orderId = orderResult.insertId;

        for (const item of orderDetails) {
          await connection.execute(
            "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
            [orderId, item.productId, item.quantity, item.unitPrice],
          );
          await connection.execute(
            "UPDATE products SET quantity = quantity - ? WHERE id = ?",
            [item.quantity, item.productId],
          );
        }
        await connection.commit();
        res.status(201).json({ message: "Order placed successfully", orderId });
      } catch (transactionErr) {
        await connection.rollback();
        throw transactionErr;
      }
    }
  } catch (err) {
    res.status(500).json({ message: "Order processing failed" });
  }
});

// --- Task 5: Search + Reports ---
app.get("/admin/reports", auth, authorize(["admin"]), async (req, res) => {
  try {
    if (isTestMode) {
      const totalSales = db.orders.reduce((sum, o) => sum + o.total_price, 0);
      const inventoryLevels = db.products.map((p) => ({
        name: p.name,
        stock: p.quantity,
      }));
      return res.json({ totalSales, inventoryLevels });
    }

    const [salesRows] = await db.execute(
      "SELECT SUM(total_price) as totalSales, COUNT(*) as orderCount FROM orders",
    );
    const [inventoryRows] = await db.execute(
      "SELECT name, quantity FROM products",
    );
    const [lowStock] = await db.execute(
      "SELECT name, quantity FROM products WHERE quantity < 10",
    );

    res.json({
      summary: salesRows[0],
      inventory: inventoryRows,
      lowStockAlerts: lowStock,
    });
  } catch (err) {
    res.status(500).json({ message: "Error generating reports" });
  }
});

// Protected route (requires authentication)
app.get("/protected", auth, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

// Profile route for authenticated users
app.get("/profile", auth, (req, res) => {
  res.json({
    message: "User profile",
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
});

// Admin-only route (requires authentication and admin role)
app.get("/admin", auth, authorize(["admin"]), (req, res) => {
  res.json({ message: "Admin only access", user: req.user });
});

// Customer route (requires authentication and customer, user, or admin role)
app.get(
  "/customer",
  auth,
  authorize(["customer", "user", "admin"]),
  (req, res) => {
    res.json({ message: "Customer access", user: req.user });
  },
);

// User route (requires authentication and user or admin role)
app.get("/user", auth, authorize(["user", "admin"]), (req, res) => {
  res.json({ message: "User access", user: req.user });
});

const PORT = 3000;

// only start server when this file is invoked directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Firebase Functions
exports.api = functions.https.onRequest(app);

module.exports = { app, dbReady, getDb };
