import { Schema, model, SchemaTypes } from 'mongoose';

const group = new Schema({
    name: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
        default: '🏖',
    },
    createdBy: {
        type: SchemaTypes.ObjectId,
        ref: 'users',
        required: true,
    },
    members: {
        type: [SchemaTypes.ObjectId],
        ref: 'users',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
});

const Group = model('group', group);

export default Group;
