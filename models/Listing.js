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
    category:
    {
        type: String,
        required: true
    },
    photo:
    {
        type: String,
        required: true
    },
    comments:
    [
        {
            user: 
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
                required: true
            },
            title: 
            {
                type: String,
                required: true
            },
            comment:
            {
                type: String,
                required: true
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
            date:
            {
                type: Date,
                default: Date.now
            }
        }
    ],
    date: 
    {
        type: Date,
        default: Date.now
    }
});

ListingSchema.index({
    title: 'text',
    description: 'text',
    user: 'text',
});

module.exports = Listing = mongoose.model('listing', ListingSchema);