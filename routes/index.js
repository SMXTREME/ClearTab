import validator from 'validator';

import { Router } from 'express';

import User from '../schema/User.js';
import jwt from '../functions/jwt.js';
import Group from '../schema/Group.js';
import authRouter from './auth/index.js';
import Expense from '../schema/Expense.js';
import groupRouter from './group/index.js';
import settingsRouter from './settings/index.js';
import activityRouter from './activity/index.js';
import hasCookie from '../middleware/hasCookie.js';
import getBalancesForUser from '../functions/getBalanceForUser.js';
import minimiseTransactions from '../functions/minimumTransaction.js';

const indexRouter = Router();

indexRouter.get('/', async (req, res) => {
    const token = req.query?.token;
    let email, error, cookie;
    if (token) {
        if (!validator.isJWT(token)) return res.redirect('/');
        const data = await jwt.read(token);
        email = data.email;
        error = data.error;
    }

    if (req.cookies?.authToken) {
        cookie = await jwt.read(req.cookies.authToken);
    }

    res.render('home', { email, error, cookie });
});

indexRouter.get('/otp', async (req, res) => {
    const token = req.query.token;
    if (!token || !validator.isJWT(token)) return res.redirect('/');

    try {
        const { email, error } = await jwt.read(token);
        res.render('otp', { email, error });
    } catch {
        res.redirect('/');
    }
});

indexRouter.get('/dashboard', hasCookie, async (req, res) => {
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

        const allTransactions = [];

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

                const txns = minimiseTransactions(balanceMap);
                const memberMap = Object.fromEntries(g.members.map((m) => [m._id.toString(), m]));

                txns.forEach((txn) => {
                    allTransactions.push({
                        from: memberMap[txn.from],
                        to: memberMap[txn.to],
                        amount: txn.amount,
                        groupName: g.name,
                    });
                });

                return {
                    ...g.toObject(),
                    members: g.members,
                    userBalance,
                    expenseCount,
                };
            }),
        );

        const myTxns = allTransactions.filter(
            (t) =>
                t.from._id.toString() === userId.toString() ||
                t.to._id.toString() === userId.toString(),
        );

        const totalOwe = myTxns
            .filter((t) => t.from._id.toString() === userId.toString())
            .reduce((sum, t) => sum + t.amount, 0);

        const totalOwed = myTxns
            .filter((t) => t.to._id.toString() === userId.toString())
            .reduce((sum, t) => sum + t.amount, 0);

        const totalBalance = totalOwed - totalOwe;
        const oweCount = myTxns.filter((t) => t.from._id.toString() === userId.toString()).length;
        const owedCount = myTxns.filter((t) => t.to._id.toString() === userId.toString()).length;

        res.render('dashboard', {
            user,
            groups: groupsWithBalance,
            transactions: allTransactions,
            totalBalance,
            totalOwe,
            totalOwed,
            oweCount,
            owedCount,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

indexRouter.use('/auth', authRouter);
indexRouter.use('/groups', hasCookie, groupRouter);
indexRouter.use('/activity', hasCookie, activityRouter);
indexRouter.use('/settings', hasCookie, settingsRouter);

export default indexRouter;
