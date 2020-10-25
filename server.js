const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator/check');
const config = require('config');
const exphbs = require( 'express-handlebars');
const hbs = require('handlebars');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');

const secret_key = config.get('SECRET_KEY');

const stripe = require('stripe')(secret_key);

const auth = require('./middleware/auth');
const User = require('./models/User');
const Listing = require('./models/Listing');

// Connect database
connectDB();

const app = express();

app.use(cookieParser());

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

// Set storage engine
const storage = multer.diskStorage({
    destination: './public/uploads',
    filename: function(req, file, cb)
    {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {fileSize: 1024 * 1024 * 3},
    fileFilter: function(req, file, cb)
    {
        checkFileType(file, cb);
    }
})
  
  // Check File Type
  function checkFileType(file, cb)
  {
    // Allowed ext
    const filetypes = /jpeg|jpg|png/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);
  
    if(mimetype && extname)
    {
      return cb(null,true);
    } 
    else 
    {
      cb('Error: Images Only!');
    }
  }

// index

app.get('/', async (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;
    id = cookies.id;

    if(token && id)
    {
        listings = await Listing.find({ user: { $nin: id }}).sort({ date: -1 }).limit(3); // Most recent listings to least recent that aren't yours
    }
    else
    {
        listings = await Listing.find().sort({ date: -1 }).limit(3); // Most recent listings to least recent
    }
    
    res.render('index.html', { listings: listings, token: token, active: { home: true } });
});

// register

app.get('/register', (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;

    if(token)
    {
        return res.redirect('/');
    }

    res.render('register.html', { page: '/ Register', active: { register: true }});
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
        // return res.redirect('/register');
        return res.render('register.html', 
        { 
            msg: "One or more fields is incorrectly inputted", 
            first_name: req.body.first_name, 
            last_name: req.body.last_name, 
            email: req.body.email, 
            password: req.body.password, 
            page: '/ Register', 
            active: { register: true }
        });
    }

    const { first_name, last_name, email, password } = req.body;

    try
    {
        // See if user exists
        let user = await User.findOne({ email: email });

        if(user)
        {
            // return res.redirect('/register');
            return res.render('register.html', 
            { 
                msg: "User with email already exists", 
                first_name: req.body.first_name, 
                last_name: req.body.last_name, 
                email: req.body.email, 
                password: req.body.password, 
                page: '/ Register', 
                active: { register: true }
            });
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
                id: user._id
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

            res.cookie('token', token);
            res.cookie('id', user._id);

            return res.redirect('/');
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
    const { cookies } = req;
    token = cookies.token;

    if(token)
    {
        return res.redirect('/');
    }

    res.render('login.html', { page: '/ Login', active: { login: true }});
});

app.post('/login', 
[
    check('email', 'Please include a valid email').isEmail(), // Checks for specific error. First param is what variable you're checking, second is error message
    check('password', 'Password is required').exists(), // Checks for specific error. First param is what variable you're checking, second is error message 
], async (req, res) => {

    const errors = validationResult(req);
    if(!errors.isEmpty())
    {
        return res.render('login.html', 
        { 
            msg: "One or more fields is incorrectly inputted", 
            email: req.body.email, 
            password: req.body.password, 
            page: '/ Login', 
            active: { login: true }
        });
    }

    const { email, password } = req.body;

    try
    {
        // See if user exists
        let user = await User.findOne({ email: email });


        if(!user)
        {
            return res.render('login.html', 
            { 
                msg: "No user exists with this email", 
                email: req.body.email, 
                password: req.body.password, 
                page: '/ Login', 
                active: { login: true }
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch)
        {
            return res.render('login.html', 
            { 
                msg: "Incorrect password", 
                email: req.body.email, 
                password: req.body.password, 
                page: '/ Login', 
                active: { login: true }
            });
        }

        const payload = {
            user: {
                id: user._id
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

            res.cookie('token', token);
            res.cookie('id', user._id);

            return res.redirect('/'); 
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
    res.clearCookie('token');
    res.clearCookie('id');
    return res.redirect('/');
});

// listings

app.get('/listings', async (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;
    id = cookies.id;

    // Gets all listings

    if(token && id)
    {
        listings = await Listing.find({ user: { $nin: id }}).sort({ date: -1 }); // Most recent listings to least recent that aren't yours
    }
    else
    {
        listings = await Listing.find().sort({ date: -1 }); // Most recent listings to least recent
    }

    display = await Listing.find().sort({ date: -1 }).limit(3);

    res.render('listings.html', { listings: listings, display: display, token: token, page: '/ Listings', active: { listings: true }, id: id});
});

app.get('/listings/filter/:category', async (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;
    id = cookies.id;
    category = req.params.category;

    if(token && id)
    {
        listings = await Listing.find({ user: { $nin: id }, category: category }).sort({ date: -1 }); // Most recent listings to least recent that aren't yours
    } 
    else
    {
        listings = await Listing.find({ category: category }).sort({ date: -1 }); // Most recent listings to least recent that aren't yours
    }

    display = await Listing.find().sort({ date: -1 }).limit(3);

    res.render('listings.html', { listings: listings, display: display, token: token, page: '/ Listings', active: { listings: true }, id: id});
});

app.post('/listings/query', async (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;
    id = cookies.id;
    query = req.body.query;

    if(token && id)
    {
        listings = await Listing.find( { $text: { $search: query } } ).sort({ date: -1 }); // Most recent listings to least recent depending on query
        listings = listings.filter(listing => listing.user != id);
    } 
    else
    {
        listings = await Listing.find( { $text: { $search: query } } ).sort({ date: -1 }); // Most recent listings to least recent depending on query
    }

    display = await Listing.find().sort({ date: -1 }).limit(3);

    res.render('listings.html', { listings: listings, display: display, token: token, page: '/ Listings', active: { listings: true }, query: query});
});

app.get('/listings/:id', async (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;    
    id = cookies.id;
    CurrentUserMade = false;
    pub_key = config.get('PUBLISHABLE_KEY');
    listing = await Listing.findById(req.params.id);
    user = await User.findById(id).select('-password');

    // Shows specific listing

    listing = await Listing.findById(req.params.id);

    if(listing.user == id)
    {
        CurrentUserMade = true;
    }

    res.render('listing.html', { user: user, listing: listing, price: listing.price * 100, key: pub_key, token: token, CurrentUserMade: CurrentUserMade, active: { listings: true }})
});

app.get('/listings/:id/edit', async (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;
    id = cookies.id;

    // Shows specific listing

    listing = await Listing.findById(req.params.id);

    if(listing.user != id || !listing)
    {
        return res.redirect('/');
    }

    res.render('edit.html', { listing: listing, token: token });
});

app.post('/listings/:id/edit', upload.single('listingImage'), async (req, res) =>
{
    const { cookies } = req;
    id = cookies.id;

    // Shows specific listing

    listing = await Listing.findById(req.params.id);

    if((listing.user != id) || !listing)
    {
        return res.redirect('/');
    }

    listing.title = req.body.title;
    listing.description = req.body.description;
    listing.price = req.body.price;
    listing.category = req.body.category;
    listing.photo = req.file.filename;

    await listing.save();

    // Edit listing

    return res.redirect('/my_listings');
});

app.post('/listings/:id/delete', async (req, res) =>
{
    const { cookies } = req;
    id = cookies.id;

    // Shows specific listing

    listing = await Listing.findById(req.params.id);

    if((listing.user != id) || !listing) // If listing is not from the current user's or doesn't exist, redirect back to the index page
    {
        return res.redirect('/');
    }

    await listing.remove();

    return res.redirect('/my_listings');
});

// Purchase route

app.post('/listings/:id/payment', auth, async (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;
    id = cookies.id;
    listing = await Listing.findById(req.params.id);
    user = await User.findById(id);

    if(listing.user == id)
    {
        return res.redirect('/');
    }

    stripe.customers.create({
        email: req.body.stripeEmail,
        source: req.body.stripeToken,
        name: user.first_name + " " + user.last_name,
    }).then((customer) => {
        return stripe.charges.create({
            amount: listing.price * 100,
            description: listing.title,
            currency: 'usd',
            customer: customer.id
        }).then((charge) => {
            console.log(charge);
            return res.redirect('/');
        })
    })
});

// my listings

app.get('/my_listings', auth, async (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;
    id = cookies.id;

    // Gets all listings

    listings = await Listing.find({ user: id });

    res.render('my_listings.html', { listings: listings, token: token, page: '/ My Listings', active: { my_listings: true }});
});

// create

app.get('/create', auth, (req, res) =>
{
    const { cookies } = req;
    token = cookies.token;

    // Go to create form

    res.render('create.html', { token: token, page: '/ Create', active: { create: true }});
});

app.post('/create', upload.single('listingImage'), auth, async (req, res) =>
{
    const { title, description, price, category } = req.body;
    const { cookies } = req;
    id = cookies.id;

    // Create a new listing

    listing = new Listing({title: title, description: description, price: price, category: category, photo: req.file.filename});

    listing.title = listing.title.trim();
    listing.description = listing.description.trim();
    listing.price = listing.price;
    listing.category = listing.category;
    listing.user = id;

    user = await User.findById(id).select('-password'); // Get current user's data

    listing.first_name = user.first_name;
    listing.last_name = user.last_name;

    await listing.save();

    return res.redirect('/listings');
});

const PORT = process.envPORT || 3000;

app.listen(PORT, () => console.log("Server started on port " + PORT));