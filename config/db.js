const { connect } = require("mongoose");

const config = require('config');
const dotenv = require("dotenv");

// Load env
dotenv.config({ path: './config.env' });
// const db = config.get("MONGO_URI");
const db = process.env.MONGO_URI;
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
