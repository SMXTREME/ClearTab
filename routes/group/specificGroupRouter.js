import { Router } from 'express';

import User from '../../schema/User.js';
import jwt from '../../functions/jwt.js';
import Group from '../../schema/Group.js';
import Expense from '../../schema/Expense.js';
import Settlement from '../../schema/Statement.js';
import getBalancesForUser from '../../functions/getBalanceForUser.js';
import minimiseTransactions from '../../functions/minimumTransaction.js';

const specificGroupRouter = Router({ mergeParams: true });

specificGroupRouter.get('/', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const groupId = req.params.id;

        const user = await User.findById(userId);
        const group = await Group.findById(groupId)
            .populate('members', 'userName email')
            .populate('createdBy', 'userName email');

        if (!group) return res.status(404).render('404', { path: req.originalUrl });

        const expenses = await Expense.find({ group: groupId })
            .populate('paidBy', 'userName email')
            .sort({ createdAt: -1 });

        const balanceMap = {};
        await Promise.all(
            group.members.map(async (m) => {
                const balances = await getBalancesForUser(m._id, groupId);
                balanceMap[m._id.toString()] = balances.reduce((sum, b) => sum + b.amount, 0);
            }),
        );

        const userBalance = balanceMap[userId.toString()] || 0;
        const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);

        const memberMap = Object.fromEntries(group.members.map((m) => [m._id.toString(), m]));
        const rawTxns = minimiseTransactions(balanceMap);
        const transactions = rawTxns.map((txn) => ({
            from: memberMap[txn.from],
            to: memberMap[txn.to],
            amount: txn.amount,
        }));

        res.render('group-detail', {
            user,
            group,
            expenses,
            userBalance,
            totalSpend,
            memberBalances: balanceMap,
            transactions,
            inviteLink: `${req.protocol}://${req.get('host')}/groups/${group._id}/invite`,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

specificGroupRouter.get('/invite', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const groupId = req.params.id;

        const user = await User.findById(userId);
        const group = await Group.findById(groupId)
            .populate('members', 'userName email')
            .populate('createdBy', 'userName email');

        if (!group) return res.status(404).render('404', { path: req.originalUrl });

        if (group.members.some((m) => m._id.toString() === userId.toString())) {
            return res.redirect(`/groups/${groupId}`);
        }

        const expenseCount = await Expense.countDocuments({ group: groupId });

        res.render('group-invite', { user, group, expenseCount });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

specificGroupRouter.post('/invite', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const groupId = req.params.id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).send('Group not found.');

        const user = await User.findById(userId);

        // guard against duplicate membership
        const alreadyMember = group.members.map((m) => m.toString()).includes(userId.toString());
        if (!alreadyMember) {
            group.members.push(userId);
            await group.save();
        }

        const alreadyInUser = user.groups.map((g) => g.toString()).includes(groupId.toString());
        if (!alreadyInUser) {
            user.groups.push(group._id);
            await user.save();
        }

        res.redirect(`/groups/${groupId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

specificGroupRouter.get('/expenses/new', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const groupId = req.params.id;

        const user = await User.findById(userId);
        const group = await Group.findById(groupId).populate('members', 'userName email');

        if (!group) return res.status(404).render('404', { path: req.originalUrl });

        res.render('expense-new', { user, group, error: undefined });
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

specificGroupRouter.post('/expenses/new', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const groupId = req.params.id;

        const user = await User.findById(userId);
        const group = await Group.findById(groupId).populate('members', 'userName email');

        if (!group) return res.status(404).send('Group not found.');

        const { description, amount, splitType, splits } = req.body;

        if (!description || !amount) {
            return res.render('expense-new', {
                user,
                group,
                error: 'Description and amount are required.',
            });
        }

        const totalAmount = parseFloat(amount);
        if (isNaN(totalAmount) || totalAmount <= 0) {
            return res.render('expense-new', {
                user,
                group,
                error: 'Enter a valid amount.',
            });
        }

        const splitsArray = Array.isArray(splits) ? splits : Object.values(splits);
        const activeSplits = splitsArray
            .filter((s) => s.included === 'true')
            .map((s) => ({ user: s.user, amount: parseFloat(s.amount) }));

        if (activeSplits.length === 0) {
            return res.render('expense-new', {
                user,
                group,
                error: 'At least one person must be included in the split.',
            });
        }

        if (splitType === 'exact') {
            const splitTotal = activeSplits.reduce((sum, s) => sum + s.amount, 0);
            if (Math.abs(splitTotal - totalAmount) >= 0.01) {
                return res.render('expense-new', {
                    user,
                    group,
                    error: `Split amounts (₹${splitTotal.toFixed(2)}) don't add up to total (₹${totalAmount.toFixed(2)}).`,
                });
            }
        }

        await new Expense({
            description,
            amount: totalAmount,
            paidBy: userId,
            group: groupId,
            splits: activeSplits,
        }).save();

        res.redirect(`/groups/${groupId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

specificGroupRouter.post('/settle', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const groupId = req.params.id;

        const { paidTo, amount } = req.body;

        if (!paidTo || !amount) return res.redirect(`/groups/${groupId}#settle`);

        const settlementAmount = parseFloat(amount);
        if (isNaN(settlementAmount) || settlementAmount <= 0) {
            return res.redirect(`/groups/${groupId}#settle`);
        }

        if (paidTo === userId.toString()) return res.redirect(`/groups/${groupId}#settle`);

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).send('Group not found.');

        const memberIds = group.members.map((m) => m.toString());
        if (!memberIds.includes(userId.toString()) || !memberIds.includes(paidTo)) {
            return res.status(403).send('Not a group member.');
        }

        await new Settlement({
            group: groupId,
            paidBy: userId,
            paidTo: paidTo,
            amount: settlementAmount,
        }).save();

        res.redirect(`/groups/${groupId}#settle`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

specificGroupRouter.post('/delete', async (req, res) => {
    try {
        const data = await jwt.read(req.cookies.authToken);
        const userId = data.userId;
        const groupId = req.params.id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).send('Group not found.');

        if (group.createdBy.toString() !== userId.toString()) {
            return res.status(403).send('Only the group owner can delete this group.');
        }

        await Expense.deleteMany({ group: groupId });
        await Settlement.deleteMany({ group: groupId });
        await User.updateMany({ groups: groupId }, { $pull: { groups: groupId } });
        await Group.findByIdAndDelete(groupId);

        res.redirect('/groups');
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong.');
    }
});

export default specificGroupRouter;
