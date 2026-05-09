import { Router } from 'express';

import User from '../../schema/User.js';
import jwt from '../../functions/jwt.js';
import Group from '../../schema/Group.js';
import Expense from '../../schema/Expense.js';
import specificGroupRouter from './specificGroupRouter.js';
import getBalancesForUser from '../../functions/getBalanceForUser.js';

const groupRouter = Router();

groupRouter.get('/', async (req, res) => {
    const data = await jwt.read(req.cookies.authToken);
    const userId = data.userId;

    const user = await User.findById(userId);

    const groups = await Group.find({ _id: { $in: user.groups } }).populate(
        'members',
        'userName email',
    );

    const groupsWithBalance = await Promise.all(
        groups.map(async (g) => {
            // raw balances for every member in this group
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

            // user's own net in this group
            const userBalance = balanceMap[userId.toString()] || 0;

            // expense count
            const expenseCount = await Expense.countDocuments({ group: g._id });

            return {
                ...g.toObject(),
                members: g.members,
                userBalance,
                expenseCount,
            };
        }),
    );

    res.render('group', { user, groups: groupsWithBalance });
});

groupRouter.get('/new', async (req, res) => {
    const data = await jwt.read(req.cookies.authToken);
    const userId = data.userId;

    const user = await User.findById(userId);

    res.render('group-new', { user, error: undefined, name: undefined });
});

groupRouter.post('/new', async (req, res) => {
    const groupName = req.body?.name;
    const groupIcon = req.body?.icon;

    const data = await jwt.read(req.cookies.authToken);
    const userId = data.userId;

    const user = await User.findById(userId);

    if (!groupIcon || !groupName)
        return res.render('group-new', {
            user,
            error: 'Group Name and Icon is required to be selected',
            name: undefined,
        });

    const group = new Group({
        name: groupName,
        icon: groupIcon,
        createdBy: user._id,
        members: [user._id],
        createdAt: Date.now(),
    });
    await group.save();

    user.groups.push(group._id);
    await user.save();

    res.redirect(`/groups/${group._id}`);
});

groupRouter.use('/:id', specificGroupRouter);

export default groupRouter;
