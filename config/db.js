const { connect } = require("mongoose");

const config = require('config');
const db = config.get("mongoURI");
const mongoose = require('mongoose');

mongoose.connect(db);

const connectDB = async () => {
    try
    {
        mongoose.set('useNewUrlParser', true);
        mongoose.set('useFindAndModify', false);
        mongoose.set('useCreateIndex', true);
        mongoose.set('useUnifiedTopology', true);

        await mongoose.connect(db);

        console.log("Connected")
    }
    catch (err)
    {
        console.error(err.message);

        process.exit(1);
    }
}

module.exports = connectDB;