const config = require('config');
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) 
{
    // Get the token from the cookie

    const { cookies } = req;

    token = cookies.token;

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