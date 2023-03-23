const express = require("express");
const mysql = require("mysql");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");

const app = express();

// Set up MySQL connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "kunal",
  database: "Att",
});

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL");
});

// Set up session
app.use(
  session({
    secret: "12323",
    resave: false,
    saveUninitialized: true,
  })
);

// Set up body parser
app.use(bodyParser.urlencoded({ extended: true }));

// Set up views directory
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

// Home page
app.get("/", (req, res) => {
  res.render("index");
});

// Registration form
app.get("/register", (req, res) => {
  res.render("register");
});

// Registration form submission
app.post("/register", function (req, res) {
  const { firstName, lastName, username, email, password, age, bio } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  connection.query(
    "INSERT INTO userdata ( firstname, lastname,username, email, password, age, bio) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [firstName, lastName, username, email, hashedPassword, age, bio],
    function (error, results, fields) {
      if (error) {
        console.error("Error registering user: " + error.stack);
        return;
      }
      console.log("User registered successfully.");
      req.session.loggedin = true;
      req.session.username = username;
      res.redirect("/attendance");
    }
  );
});

// Login form
app.get("/login", (req, res) => {
  res.render("login");
});

// Login form submission
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  connection.query(
    "SELECT * FROM userdata WHERE username = ?",
    [username],
    (error, results, fields) => {
      if (error) {
        console.error("Error retrieving user from database:", error);
        res.redirect("/login");
        return;
      }
      if (results.length === 0) {
        console.log("User not found");
        res.redirect("/login");
        return;
      }
      const user = results[0];
      // Compare passwords
      if (!bcrypt.compareSync(password, user.password)) {
        console.log("Incorrect password");
        res.redirect("/login");
        return;
      }
      // Store user ID in session
      req.session.userId = user.id;
      console.log("User logged in");
      req.session.loggedin = true;
      res.redirect("/attendance");
    }
  );
});

// Attendance page
app.get("/attendance", function (req, res) {
  if (req.session.loggedin) {
    connection.query(
      "SELECT * FROM userdata WHERE username <> ?",
      [req.session.username],
      function (err, results, fields) {
        if (err) {
          console.error("Error querying database: " + err.stack);
          return;
        }

        const students = results;

        connection.query(
          "SELECT student_id, date FROM attendance WHERE date = ?",
          [new Date().toISOString().slice(0, 10)],
          function (err, results, fields) {
            if (err) {
              console.error("Error querying database: " + err.stack);
              return;
            }

            const attendance = {};
            for (const result of results) {
              attendance[result.student_id] = "Present";
            }

            res.render("attendance", {
              students: students,
              attendance: attendance,
            });
          }
        );
      }
    );
  } else {
    res.redirect("/");
  }
});

// Attendance submission
app.post("/attendance", (req, res) => {
  // Check if user is logged in
  if (!req.session.userId) {
    console.log("User not logged in");
    res.redirect("/login");
    return;
  }
  const { date } = req.body;
  if (!date) {
    console.error("Error marking attendance: Date parameter is blank.");
    res.status(400).send("Date parameter is required.");
    return;
  }
  connection.query(
    "INSERT INTO attendance (student_id, date) VALUES (?, ?)",
    [req.session.userId, date],
    (error, results, fields) => {
      if (error) {
        console.error("Error adding attendance record to database:", error);
        res.redirect("/attendance");
        return;
      }
      console.log("Attendance recorded");
      res.redirect("/attendance");
    }
  );
});

// Admin page
app.get("/admin", function (req, res) {
  if (req.session.loggedin) {
    connection.query("SELECT * FROM userdata", function (err, results, fields) {
      if (err) {
        console.error("Error querying database: " + err.stack);
        return;
      }

      const users = results;

      res.render("admin", { users: users });
    });
  } else {
    res.redirect("/");
  }
});

// Logout
app.get("/logout", (req, res) => {
  // Destroy session
  req.session.destroy();
  console.log("User logged out");
  res.redirect("/");
});

// Start server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});
