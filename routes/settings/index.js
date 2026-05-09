import { Router } from 'express';

import User from '../../schema/User.js';
import jwt from '../../functions/jwt.js';
import Group from '../../schema/Group.js';
import Expense from '../../schema/Expense.js';
import Settlement from '../../schema/Statement.js';

const settingsRouter = Router();

settingsRouter.get('/', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const user = await User.findById(data.userId);
        res.render('settings', { user, success: undefined, error: undefined });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

settingsRouter.post('/username', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const { userName } = req.body;
        const user = await User.findById(data.userId);

        if (
            !userName ||
            !/^[a-zA-Z0-9_]+$/.test(userName) ||
            userName.length < 3 ||
            userName.length > 20
        ) {
            return res.render('settings', {
                user,
                error: 'Username must be 3–20 characters. Letters, numbers, and underscores only.',
                success: undefined,
            });
        }

        user.userName = userName;
        await user.save();

        res.render('settings', { user, success: 'Username updated.', error: undefined });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

settingsRouter.post('/delete-account', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const user = await User.findById(userId);

        await Expense.deleteMany({ paidBy: userId });

        await Group.updateMany({ members: userId }, { $pull: { members: userId } });

        await Group.updateMany(
            { createdBy: userId, members: { $exists: true, $not: { $size: 0 } } },
            [{ $set: { createdBy: { $arrayElemAt: ['$members', 0] } } }],
        );

        const ownedEmptyGroups = await Group.find({ createdBy: userId, members: { $size: 0 } });
        for (const g of ownedEmptyGroups) {
            await Expense.deleteMany({ group: g._id });
            await Settlement.deleteMany({ group: g._id });
            await g.deleteOne();
        }

        await Settlement.deleteMany({ $or: [{ paidBy: userId }, { paidTo: userId }] });

        await user.deleteOne();

        res.clearCookie('authToken');
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

export default settingsRouter;
