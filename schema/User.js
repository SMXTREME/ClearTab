import { Schema, model, SchemaTypes } from 'mongoose';

const users = new Schema({
    userName: {
        type: SchemaTypes.String,
        required: true,
    },
    email: {
        type: SchemaTypes.String,
        required: true,
        unique: true,
    },
    groups: {
        type: [SchemaTypes.ObjectId],
        default: [],
    },
});

const User = model('users', users);

export default User;
