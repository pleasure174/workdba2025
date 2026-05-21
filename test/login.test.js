const mocha = require("mocha");
const chai = require("chai");
const chaiHttp = require("chai-http");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { app, dbReady, getDb } = require("../server");
const { expect } = chai;

chai.use(chaiHttp);

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "auth_db",
};

// helper to reset the users table before each test
async function resetUsers() {
  const db = getDb();
  db.clear();
  const hashedAdmin = bcrypt.hashSync("admin123", 8);
  const hashedUser = bcrypt.hashSync("user123", 8);
  db.addUser("admin", hashedAdmin, "admin");
  db.addUser("user", hashedUser, "user");
}

describe("Authentication and Authorization Suite", () => {
  before(async () => {
    // ensure db is ready and cleaned out
    await dbReady;
    await resetUsers();
  });

  beforeEach(async () => {
    await resetUsers();
  });

  // registration tests
  it("should register a new user successfully", (done) => {
    chai
      .request(app)
      .post("/register")
      .send({ username: "newuser", password: "pass123" })
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body.message).to.equal("User registered successfully");
        done();
      });
  });

  it("should fail registration when username is missing", (done) => {
    chai
      .request(app)
      .post("/register")
      .send({ password: "pass123" })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.message).to.include("Username and password");
        done();
      });
  });

  it("should fail registration when password is missing", (done) => {
    chai
      .request(app)
      .post("/register")
      .send({ username: "someone" })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.message).to.include("Username and password");
        done();
      });
  });

  it("should not allow duplicate usernames", (done) => {
    chai
      .request(app)
      .post("/register")
      .send({ username: "admin", password: "anything" })
      .end((err, res) => {
        expect(res).to.have.status(409);
        expect(res.body.message).to.equal("Username already exists");
        done();
      });
  });

  it("should allow registration with a custom role and login reflects role", (done) => {
    const custom = { username: "special", password: "secret", role: "manager" };
    chai
      .request(app)
      .post("/register")
      .send(custom)
      .end((err, res) => {
        expect(res).to.have.status(201);
        chai
          .request(app)
          .post("/login")
          .send({ username: custom.username, password: custom.password })
          .end((e2, r2) => {
            expect(r2).to.have.status(200);
            const decoded = jwt.verify(r2.body.token, "secretkey");
            expect(decoded.role).to.equal("manager");
            done();
          });
      });
  });

  // login tests
  it("should log in admin successfully", (done) => {
    chai
      .request(app)
      .post("/login")
      .send({ username: "admin", password: "admin123" })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("token");
        const decoded = jwt.verify(res.body.token, "secretkey");
        expect(decoded.role).to.equal("admin");
        done();
      });
  });

  it("should log in user successfully", (done) => {
    chai
      .request(app)
      .post("/login")
      .send({ username: "user", password: "user123" })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("token");
        const decoded = jwt.verify(res.body.token, "secretkey");
        expect(decoded.role).to.equal("user");
        done();
      });
  });

  it("should reject login with wrong username", (done) => {
    chai
      .request(app)
      .post("/login")
      .send({ username: "noone", password: "whatever" })
      .end((err, res) => {
        expect(res).to.have.status(401);
        done();
      });
  });

  it("should reject login with wrong password", (done) => {
    chai
      .request(app)
      .post("/login")
      .send({ username: "admin", password: "wrong" })
      .end((err, res) => {
        expect(res).to.have.status(401);
        done();
      });
  });

  it("should reject login when fields are missing", (done) => {
    chai
      .request(app)
      .post("/login")
      .send({ username: "admin" })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.message).to.include("Username and password");
        done();
      });
  });

  // protected route tests
  it("should block /protected without token", (done) => {
    chai
      .request(app)
      .get("/protected")
      .end((err, res) => {
        expect(res).to.have.status(403);
        done();
      });
  });

  it("should block /protected with invalid token", (done) => {
    chai
      .request(app)
      .get("/protected")
      .set("Authorization", "Bearer abc.def.ghi")
      .end((err, res) => {
        expect(res).to.have.status(401);
        done();
      });
  });

  it("should allow /protected with valid token", (done) => {
    const token = jwt.sign({ id: 1, role: "user" }, "secretkey", {
      expiresIn: "1h",
    });
    chai
      .request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.user.role).to.equal("user");
        done();
      });
  });

  it("should allow /profile with valid token", (done) => {
    const token = jwt.sign({ id: 1, role: "user" }, "secretkey", {
      expiresIn: "1h",
    });
    chai
      .request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("user");
        expect(res.body.user.role).to.equal("user");
        done();
      });
  });

  // admin route tests
  it("should block /admin without token", (done) => {
    chai
      .request(app)
      .get("/admin")
      .end((err, res) => {
        expect(res).to.have.status(403);
        done();
      });
  });

  it("should block /admin with user token", (done) => {
    const token = jwt.sign({ id: 2, role: "user" }, "secretkey", {
      expiresIn: "1h",
    });
    chai
      .request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(403);
        done();
      });
  });

  it("should allow /admin with admin token", (done) => {
    const token = jwt.sign({ id: 1, role: "admin" }, "secretkey", {
      expiresIn: "1h",
    });
    chai
      .request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.user.role).to.equal("admin");
        done();
      });
  });

  // user route tests
  it("should block /user without token", (done) => {
    chai
      .request(app)
      .get("/user")
      .end((err, res) => {
        expect(res).to.have.status(403);
        done();
      });
  });

  it("should allow /user with user token", (done) => {
    const token = jwt.sign({ id: 2, role: "user" }, "secretkey", {
      expiresIn: "1h",
    });
    chai
      .request(app)
      .get("/user")
      .set("Authorization", `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.user.role).to.equal("user");
        done();
      });
  });

  it("should allow /user with admin token", (done) => {
    const token = jwt.sign({ id: 1, role: "admin" }, "secretkey", {
      expiresIn: "1h",
    });
    chai
      .request(app)
      .get("/user")
      .set("Authorization", `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.user.role).to.equal("admin");
        done();
      });
  });

  // token expiration test
  it("should reject expired token on protected route", (done) => {
    const expired = jwt.sign({ id: 123, role: "user" }, "secretkey", {
      expiresIn: "-1h",
    });
    chai
      .request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${expired}`)
      .end((err, res) => {
        expect(res).to.have.status(401);
        done();
      });
  });
});
