import { Schema, model, SchemaTypes } from 'mongoose';

const settlement = new Schema({
    group: {
        type: SchemaTypes.ObjectId,
        ref: 'groups',
        required: true,
    },
    paidBy: {
        type: SchemaTypes.ObjectId,
        ref: 'users',
        required: true,
    }, // person who paid
    paidTo: {
        type: SchemaTypes.ObjectId,
        ref: 'users',
        required: true,
    }, // person who received
    amount: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Settlement = model('settlement', settlement);

export default Settlement;
