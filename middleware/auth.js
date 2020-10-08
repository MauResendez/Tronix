const config = require('config');
const jwt = require('jsonwebtoken');
const LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');

module.exports = function(req, res, next) 
{
    // Get the token from the header
    // const token = req.header('x-auth-token');

    token = localStorage.getItem('token');

    console.log(token);
    console.log("HI");

    // If token exists or not
    if(!token)
    {
        return res.status(401).json({ msg: "Not authorized to go here"});
    }

    // Verify token
    try
    {
        const decoded = jwt.verify(token, config.get('jwtSecret'));

        req.user = decoded.user;
        next();
    }
    catch (err)
    {
        res.status(401).json({ msg: "Token is not valld" });
    }
}