const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

//For Assignement 7
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const morgan = require("morgan");
const bcrypt = require("bcryptjs"); //use for hashing passwords

// Creating the Express server
const app = express();
const router = express.Router();

// Username Session variable
var usernickname = "";

// Server configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false })); // <--- middleware configuration


//Server configuration for user's accounts
app.use(morgan('dev'));  // set morgan to log info about our requests for development use
app.use(bodyParser.urlencoded({ extended: true })); // initialize body-parser to parse incoming parameters requests to req.body
app.use(cookieParser());// initialize cookie-parser to allow us access the cookies stored in the browser.
app.use(session({key:'user_sid', secret: 'randomthings',saveUninitialized: false ,resave: false ,cookie: {expires: 600000}})); //initialisation of the session
app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
      res.clearCookie('user_sid');        
  }
  next();
}); //Middleware to check if user's cookie is still saved in browser and user is not set
var sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
      res.redirect('/faq');
  } else {
      next();
  }    
}; // middleware function to check for logged-in users
//If user connected, redirection to /faq
//Function used for sign in and sign up pages

var sessionCheckerPages = (req, res, next) => {
  if(req.session.user && req.cookies.user_sid) {
    next();
  } else {
    res.redirect('/signup');
  }    
}; //If session not opened, redirection to sign up page
//Function used for the other pages

// Starting the server
app.listen(3000, () => {
  console.log("Server started (http://localhost:3000/) !");
});




//----------------------------------------------- //
//---------------- ASSIGNEMENT 5 ---------------- //
//----------------------------------------------- //



// Connecting the database
const db_name = path.join(__dirname, "data", "apptest.db");
const db = new sqlite3.Database(db_name, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database 'apptest.db'");
});

// Database FAQ creation
const sql_create_faq = `CREATE TABLE IF NOT EXISTS Faq (
    faqId INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    reponse TEXT NOT NULL,
    domaine TEXT NOT NULL,
    author TEXT NOT NULL,
    rating INTEGER);`;
const sql_drop_faq = `DROP TABLE Faq;`;
db.run(sql_create_faq, err => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Successful creation of the 'Faq' table");
});

// GET /Welcome page
app.get("/welcome",sessionCheckerPages, (req, res) => {
  res.render("index", {displaynickname: usernickname});
});

// GET /about
app.get("/about",sessionCheckerPages,  (req, res) => {
  res.render("about", {displaynickname : usernickname});
});

// GET /display faq
app.get("/faq", sessionCheckerPages, (req, res) => {
  const sql = "SELECT * FROM Faq ORDER BY rating DESC"
  const sql_answer ="SELECT * FROM Answers ORDER BY votes DESC"
  db.all(sql, [], (err, rows) => {
    if (err) {
      return console.error(err.message);
    }
    db.all(sql_answer, [], (err2, rows_ans) => {
      if (err2) {
        return console.error(err2.message);
      }
      res.render("faq", { model: rows, model_answers: rows_ans, displaynickname: usernickname });
    })
    
  });
});

// POST /add to faq
app.post("/faq/", (req, res) => {
  const sql = "INSERT INTO Faq (question, reponse, domaine, author, rating) VALUES (?, ?, ?, ?, 0)";
  const faq = [req.body.question, req.body.reponse, req.body.domaine, usernickname];
  db.run(sql, faq, err => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/faq");
  });
});

// POST /delete from faq
app.post("/delete/:id", (req, res) => {
  const sql = "DELETE FROM Faq WHERE faqId = ?";
  const id = req.params.id;
  //const param = ['%'+req.body.key+'%','%'+req.body.key+'%'];
  db.run(sql, id, err => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/faq");
  });
});




//----------------------------------------------- //
//---------------- ASSIGNEMENT 6 ---------------- //
//----------------------------------------------- //


// GET /faq/domaine
app.get("/faq/:domaine", (req, res) => {
  const dom = req.params.domaine;
  const sql = "SELECT * FROM Faq WHERE domaine = ?";
  db.all(sql, dom, (err, rows) => {
    if (err) {
      return console.error(err.message);
    }
    res.render("faq", { model: rows, displaynickname: usernickname });
  });
});

// POST /searchbox
app.post("/search", (req, res) => {
  const sql = "SELECT * FROM Faq WHERE question LIKE ? OR reponse LIKE ?";
  const param = ['%'+req.body.key+'%','%'+req.body.key+'%'];
  db.all(sql, param, (err, rows) => {
    if (err) {
      return console.error(err.message);
    }
    res.render("faq", { model: rows, displaynickname: usernickname });
  });
});




//----------------------------------------------- //
//---------------- ASSIGNEMENT 7 ---------------- //
//----------------------------------------------- //


// Database FAQ creation
const sql_create_users = `CREATE TABLE IF NOT EXISTS Users (
  userId INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  enc_password TEXT NOT NULL);`;

//const sql_drop_table = `DROP TABLE Faq;`;
db.run(sql_create_users, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful creation of the 'Users' table");
});


// route for Home-Page (faq) 
app.get('/', sessionChecker, (req, res) => {
  res.redirect('/signup');
});

// route for user signup
app.route('/signup')
    .get(sessionChecker, (req, res) => {
      res.render("signup");
    })
    .post((req, res) => {
      
      const { email, nickname, password ,passwordChecker} = req.body;

      if(password != passwordChecker){
        res.redirect('/signup');
        return console.log("Passwords differents ! Please retry");
      }

      else {
        const salt = bcrypt.genSaltSync();
        const hashedPassword = bcrypt.hashSync(password, salt); //Password encryptment
        const sql = "INSERT INTO Users(email, nickname, enc_password) VALUES (?, ?, ?)";
        const param = [email, nickname, hashedPassword];

        db.run(sql, param, err => {
          if (err) {
            res.redirect('/signup');
            return console.error(err.message);
          }
          req.session.user = {email : email, nickname : nickname, password : hashedPassword};
          usernickname = nickname;
          res.redirect("/faq");
        });
      }
    });

// route for user Login
app.route('/signin')
    .get(sessionChecker, (req, res) => {
      res.render("signin");
    })
    .post((req, res) => {
        const email = req.body.email,
          password = req.body.password;
        const sql = "SELECT * FROM Users WHERE email = ?";

        db.get(sql, email, (err, row) => {
          if(err) {
            res.redirect('/signin');
            return console.error(err.message);
          }
          else if(row != null){
            console.log("Account found in the DB");
            var validPassword = bcrypt.compareSync(password, row.enc_password);
            if(validPassword){
              console.log("Password valid. Connection etablished with your account");
              req.session.user = {email : req.body.email, nickname : row.nickname, password : row.enc_password};
              usernickname = row.nickname;

              //Debug 
              console.log("usernickname : " + usernickname);
              console.log("req.session.user : " + req.session.user);
              console.log("req.session.user.email = " +req.session.user.email);
              console.log("req.session.user.nickname = " +req.session.user.nickname);

              return res.redirect('/faq');
            }
            else{
              console.log("Error Password");
              return res.redirect('/signin');
            }
          }
          else{
            console.log("ERROR: No account found");
            return res.redirect('/signin');
          }
        });
    });

 // route for user logout
app.get('/logout', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
    console.log("Log out : end of session");
    usernickname = "";
    res.clearCookie('user_sid');
    res.redirect('/signup');
  } 
  else {
    console.log("No session opened, please sign in first");
    res.redirect('/signup');
  }
});

// route for handling 404 requests(unavailable routes)
/*app.use(function (req, res, next) {
  res.status(404).send("404 ERROR: Sorry can't find that!")
});*/

//POST /like
app.post('/like/:id', (req, res) => {
  const sql = "UPDATE Faq SET rating = rating + 1 WHERE faqId = ?";
  const id = req.params.id;
  db.run(sql, id, err => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect('/faq');
  });
});

const sql_create_answers = `CREATE TABLE IF NOT EXISTS Answers (
  ansId INTEGER PRIMARY KEY AUTOINCREMENT,
  faqId INTEGER,
  reponse TEXT NOT NULL,
  nom_auteur TEXT NOT NULL,
  votes INTEGER);`;

db.run(sql_create_answers , err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful creation of the 'Answers' table");
});

// GET /upgrade
app.get("/upgrade/:id", sessionCheckerPages, (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM Faq WHERE faqId = ?"
  db.get(sql, id, (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    res.render("upgrade", { model: row, displaynickname: usernickname});
  });
});

// POST /upgrade
app.post("/upgrade/:id", (req, res) => {
  const params = [req.params.id, req.body.answer, usernickname];
  const sql = "INSERT INTO Answers(faqId, reponse, nom_auteur, votes) VALUES (?, ?, ?, 0)";
  db.run(sql, params, err => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/faq");
  });
});

//POST /like_ans
app.post('/like_ans/:id', (req, res) => {
  const sql = "UPDATE Answers SET votes = votes + 1 WHERE faqId = ?";
  const id = req.params.id;
  db.run(sql, id, err => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect('/faq');
  });
});
