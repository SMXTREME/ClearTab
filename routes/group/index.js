import { Router } from 'express';

import User from '../../schema/User.js';
import jwt from '../../functions/jwt.js';
import Group from '../../schema/Group.js';
import Expense from '../../schema/Expense.js';
import specificGroupRouter from './specificGroupRouter.js';
import getBalancesForUser from '../../functions/getBalanceForUser.js';

const groupRouter = Router();

groupRouter.get('/', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;

        const user = await User.findById(userId);
        const groups = await Group.find({ _id: { $in: user.groups } }).populate(
            'members',
            'userName email',
        );

        const expenseCounts = await Expense.aggregate([
            { $match: { group: { $in: groups.map((g) => g._id) } } },
            { $group: { _id: '$group', count: { $sum: 1 } } },
        ]);
        const expenseCountMap = Object.fromEntries(
            expenseCounts.map((e) => [e._id.toString(), e.count]),
        );

        const groupsWithBalance = await Promise.all(
            groups.map(async (g) => {
                const balanceMap = {};
                await Promise.all(
                    g.members.map(async (member) => {
                        const balances = await getBalancesForUser(member._id, g._id);
                        balanceMap[member._id.toString()] = balances.reduce(
                            (sum, b) => sum + b.amount,
                            0,
                        );
                    }),
                );

                const userBalance = balanceMap[userId.toString()] || 0;
                const expenseCount = expenseCountMap[g._id.toString()] || 0;

                return {
                    ...g.toObject(),
                    members: g.members,
                    userBalance,
                    expenseCount,
                };
            }),
        );

        res.render('group', { user, groups: groupsWithBalance });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

groupRouter.get('/new', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const user = await User.findById(userId);

        res.render('group-new', { user, error: undefined, name: undefined });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

groupRouter.post('/new', async (req, res) => {
    try {
        const groupName = req.body?.name?.trim();
        const groupIcon = req.body?.icon;

        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const user = await User.findById(userId);

        if (!groupIcon || !groupName) {
            return res.render('group-new', {
                user,
                error: 'Group name and icon are required.',
                name: groupName,
            });
        }

        const group = new Group({
            name: groupName,
            icon: groupIcon,
            createdBy: user._id,
            members: [user._id],
        });
        await group.save();

        user.groups.push(group._id);
        await user.save();

        res.redirect(`/groups/${group._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

groupRouter.use('/:id', specificGroupRouter);

export default groupRouter;
