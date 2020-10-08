const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
    user: 
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    first_name:
    {
        type: String,
        required: true
    },
    last_name:
    {
        type: String,
        required: true
    },
    title: 
    {
        type: String,
        required: true
    },
    description: 
    {
        type: String,
        required: true
    },
    price:
    {
        type: Number,
        required: true
    },
    photo:
    {
        type: String,
    },
    date: 
    {
        type: Date,
        default: Date.now
    }
});

module.exports = Listing = mongoose.model('listing', ListingSchema);