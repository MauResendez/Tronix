const express = require('express');
const connectDB = require('./config/db');

const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator/check');
const config = require('config');
const exphbs = require( 'express-handlebars');
const hbs = require('handlebars');
const jwt = require('jsonwebtoken');
const path = require('path');
const session = require('express-session');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');

const LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');

const auth = require('./middleware/auth');
const User = require('./models/User');
const Listing = require('./models/Listing');

// Connect database
connectDB();

const app = express();

app.use(express.static(__dirname + './public'));
app.set('views', './views');
app.set('view engine', 'html');
app.engine( 'html', exphbs({
  extname: 'html',
  handlebars: allowInsecurePrototypeAccess(hbs)
}));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// set up session (in-memory storage by default)
app.use(session({secret: "Secret Code"}));

app.use(express.static(__dirname + '/public'));

// index

app.get('/', (req, res) =>
{
    token = localStorage.getItem('token');
    
    res.render('index.html', { token: token, active: true });
});

// register

app.get('/register', (req, res) =>
{
    token = localStorage.getItem('token');

    if(token)
    {
        return res.redirect('/');
    }

    res.render('register.html', { page: '/ Register'});
});

app.post('/register', 
[
    check('first_name', 'First name is required').not().isEmpty(), // Checks for specific error. First param is what variable you're checking, second is error message
    check('last_name', 'Last name is required').not().isEmpty(), // Checks for specific error. First param is what variable you're checking, second is error message
    check('email', 'Please include a valid email').isEmail(), // Checks for specific error. First param is what variable you're checking, second is error message
    check('password', 'Please enter a password with 8 or more characters').isLength({ min: 8 }), // Checks for specific error. First param is what variable you're checking, second is error message 
], async (req, res) => {

    const errors = validationResult(req);

    if(!errors.isEmpty())
    {
        return res.redirect('/register');
    }

    const { first_name, last_name, email, password } = req.body;

    try
    {
        // See if user exists
        let user = await User.findOne({ email: email });

        if(user)
        {
            return res.redirect('/register');
        }

        user = new User({first_name, last_name, email, password});

        // Encrypt password

        const salt = await bcrypt.genSalt(10);

        user.first_name = user.first_name.trim(); // To get rid of any unnecessary spaces on the start and end of the first name
        user.last_name = user.last_name.trim(); // To get rid of any unnecessary spaces on the start and end of the last name
        user.password = user.password;

        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        }

        // Lets you get a jwt token from your payload and own config secret to use to authenticate access on private routes

        jwt.sign(payload, config.get('jwtSecret'), 
        {
            expiresIn: 360000
        }, 
        (err, token) => {
            if(err)
            {
                throw err;
            }

            if(!token)
            {
                return res.redirect('/register');
            }

            localStorage.setItem('token', token);

            req.session.user = user;

            req.session.save(function(err)
            {
                return res.redirect('/');        
            });
        });
    }
    catch (err)
    {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// login

app.get('/login', (req, res) =>
{
    token = localStorage.getItem('token');

    if(token)
    {
        return res.redirect('/');
    }

    res.render('login.html');
});

app.post('/login', 
[
    check('email', 'Please include a valid email').isEmail(), // Checks for specific error. First param is what variable you're checking, second is error message
    check('password', 'Password is required').exists(), // Checks for specific error. First param is what variable you're checking, second is error message 
], async (req, res) => {

    const errors = validationResult(req);
    if(!errors.isEmpty())
    {
        return res.redirect('/login');
    }

    const { email, password } = req.body;

    try
    {
        // See if user exists
        let user = await User.findOne({ email: email });


        if(!user)
        {
            return res.redirect('/login');
        }


        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch)
        {
            return res.redirect('/login');
        }

        const payload = {
            user: {
                id: user.id
            }
        }

        // Lets you get a jwt token from your payload and own config secret to use to authenticate access on private routes

        jwt.sign(payload, config.get('jwtSecret'), 
        {
            expiresIn: 360000
        }, 
        (err, token) => {
            if(err)
            {
                throw err;
            }

            if(!token)
            {
                return res.redirect('/login');
            }

            localStorage.setItem('token', token);

            req.session.user = user;

            req.session.save(function(err)
            {
                return res.redirect('/');        
            });
        });
    }
    catch (err)
    {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// logout

app.get('/logout', (req, res) =>
{
    delete req.session.user;
    localStorage.clear();
    return res.redirect('/');
})

const PORT = process.envPORT || 3000;

app.listen(PORT, () => console.log("Server started on port " + PORT));