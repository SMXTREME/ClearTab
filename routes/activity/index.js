import { Router } from 'express';

import User from '../../schema/User.js';
import jwt from '../../functions/jwt.js';
import Group from '../../schema/Group.js';
import Expense from '../../schema/Expense.js';
import Settlement from '../../schema/Statement.js';

const activityRouter = Router();

activityRouter.get('/', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const user = await User.findById(userId);

        const groups = await Group.find({ _id: { $in: user.groups } });

        const groupIds = groups.map((g) => g._id);
        const groupMap = Object.fromEntries(groups.map((g) => [g._id.toString(), g]));

        const [expenses, settlements] = await Promise.all([
            Expense.find({ group: { $in: groupIds } })
                .populate('paidBy', 'userName email')
                .sort({ createdAt: -1 }),
            Settlement.find({ group: { $in: groupIds } })
                .populate('paidBy', 'userName email')
                .populate('paidTo', 'userName email')
                .sort({ createdAt: -1 }),
        ]);

        const events = [
            ...expenses.map((e) => ({
                type: 'expense',
                paidBy: e.paidBy,
                description: e.description,
                amount: e.amount,
                groupId: e.group.toString(),
                groupName: groupMap[e.group.toString()]?.name,
                groupIcon: groupMap[e.group.toString()]?.icon,
                createdAt: e.createdAt,
            })),
            ...settlements.map((s) => ({
                type: 'settlement',
                paidBy: s.paidBy,
                paidTo: s.paidTo,
                amount: s.amount,
                groupId: s.group.toString(),
                groupName: groupMap[s.group.toString()]?.name,
                groupIcon: groupMap[s.group.toString()]?.icon,
                createdAt: s.createdAt,
            })),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.render('activity', { user, groups, events });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

export default activityRouter;
