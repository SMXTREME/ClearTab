import { Router } from 'express';

import User from '../../schema/User.js';
import jwt from '../../functions/jwt.js';
import Group from '../../schema/Group.js';
import Expense from '../../schema/Expense.js';
import Settlement from '../../schema/Statement.js';

const settingsRouter = Router();

settingsRouter.get('/', async (req, res) => {
    const data = await jwt.read(req.cookies.authToken);
    const user = await User.findById(data.userId);
    res.render('settings', { user, success: undefined, error: undefined });
});

settingsRouter.post('/username', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const { userName } = req.body;

        if (!userName || !/^[a-zA-Z0-9_]+$/.test(userName)) {
            const user = await User.findById(data.userId);
            return res.render('settings', {
                user,
                error: 'Username can only contain letters, numbers, and underscores.',
                success: undefined,
            });
        }

        const user = await User.findById(data.userId);
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

        const ownedGroups = await Group.find({ createdBy: userId });
        for (const g of ownedGroups) {
            if (g.members.length === 0) {
                await Expense.deleteMany({ group: g._id });
                await Settlement.deleteMany({ group: g._id });
                await g.deleteOne();
            }
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
