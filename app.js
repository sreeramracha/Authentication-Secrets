require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email : String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});
  
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
        });
    }
));


passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
        });
    }
));

app.get("/", (req, res) => {
    res.render("home");
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect('/secrets');
    });

app.get('/auth/facebook',
    passport.authenticate('facebook'));
  
app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
    });

app.route("/register")
    
    .get((req, res) => {
        res.render("register");
    })

    .post((req, res) => {

        User.register({username: req.body.username}, req.body.password, (err, user) => {
            if (err){
                console.log(err);
                res.redirect("/register");
            }
            else{
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets");
                });
            }
        });
    });

app.route("/login")
    
    .get((req, res) => {
        res.render("login");
    })

    .post((req, res) => {

        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, function(err){
            if (err){
                console.log(err);
            }
            else{
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets");
                });
            }
        });

    });


app.route("/secrets")
    .get((req, res) => {
        User.find({secret: {$ne: null}}, function(err, foundUsers){
            if (err){
                console.log(err);
            }
            else{
                if (foundUsers){
                    res.render("secrets", {usersWithSecrets: foundUsers});
                }
            }
        })
    });


app.route("/submit")
    
    .get((req, res) => {
        if (req.isAuthenticated()){
            res.render("submit");
        } 
        else{
            res.redirect("/login");
        }    
    })
    
    .post((req, res) => {
        const submittedSecret = req.body.secret;

        console.log(req.user.id);

        User.findById(req.user.id, (err, foundUser) => {
            if (err){
                console.log(err);
            }
            else{
                if (foundUser){
                    foundUser.secret = submittedSecret;
                    foundUser.save(function(){
                        res.redirect("/secrets");
                    });
                }
            }
        });
    });

app.route("/logout")

    .get((req, res) => {
        req.logout(function(err){
            if (err){
                console.log(err);
            }
            else{
                res.redirect("/");
            }
        });
    });


app.listen("3000", (req, res) => {
    console.log("Server started listening on port 3000");
});




// For md5, bcrypt
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;


// To access .env
// console.log(process.env.API_KEY);

// console.log(md5("q1w2E3r4t5"));

// To use
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });


// app.post("/login", (req, res) => {
        // const username = req.body.username;
        // const password = req.body.password;
    
        // User.findOne({email: username}, (err, foundUser) => {
        //     if (err){
        //         console.log(err);
        //     }
        //     else{
        //         if (foundUser){
        //             bcrypt.compare(password, foundUser.password, function(err, result) {
        //                 // result == true
        //                 if (result === true) {
        //                     res.render("secrets");
        //                 }
        //             });
        //         }
        //     }
        // });
// });

// app.post("/register", (req, res) => {
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });

    //     newUser.save((err) => {
    //         if (err){
    //             console.log(err);
    //         }
    //         else{
    //             res.render("secrets");
    //         }
    //     });
    // });
// });