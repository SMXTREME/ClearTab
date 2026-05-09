import { Schema, model, SchemaTypes } from 'mongoose';

const expense = new Schema({
    description: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    paidBy: {
        type: SchemaTypes.ObjectId,
        ref: 'users',
        required: true,
    },
    group: {
        type: SchemaTypes.ObjectId,
        ref: 'groups',
        required: true,
    },
    splits: [
        {
            user: {
                type: SchemaTypes.ObjectId,
                ref: 'users',
            },
            amount: {
                type: Number,
            }, // how much this user owes for this expense
        },
    ],
    createdAt: { type: Date, default: Date.now },
});

const Expense = model('expense', expense);

export default Expense;
