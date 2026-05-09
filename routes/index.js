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
    console.log(req.protocol + '://' + req.get('host'));
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

    if (!token) return res.redirect('/');
    if (!validator.isJWT(token)) return res.redirect('/');

    const { email, error } = await jwt.read(token);

    res.render('otp', { email, error });
});

indexRouter.get('/dashboard', hasCookie, async (req, res) => {
    const data = await jwt.read(req.cookies.authToken);
    const userId = data.userId;

    // 1. fetch user
    const user = await User.findById(userId);

    // 2. fetch groups with member count
    const groups = await Group.find({ _id: { $in: user.groups } }).populate(
        'members',
        'userName email',
    );

    // 3. per group — calculate userBalance + expenseCount + minimised transactions
    const allTransactions = [];

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

            // minimised transactions for this group
            const txns = minimiseTransactions(balanceMap);

            // populate from/to with user objects already in g.members
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

    // 4. compute dashboard totals from user's perspective only
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
        transactions: allTransactions, // all — EJS handles highlighting yours
        totalBalance,
        totalOwe,
        totalOwed,
        oweCount,
        owedCount,
    });
});

indexRouter.use('/auth', authRouter);
indexRouter.use('/groups', hasCookie, groupRouter);
indexRouter.use('/activity', hasCookie, activityRouter);
indexRouter.use('/settings', hasCookie, settingsRouter);

export default indexRouter;
