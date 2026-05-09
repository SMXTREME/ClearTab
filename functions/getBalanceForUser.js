import Expense from '../schema/Expense.js';
import Settlement from '../schema/Statement.js';

async function getBalancesForUser(userId, groupId) {
    const expenses = await Expense.find({ group: groupId });
    const settlements = await Settlement.find({ group: groupId });

    const balanceMap = {}; // { otherUserId: amount }  positive = they owe you

    for (const exp of expenses) {
        const paidBy = exp.paidBy.toString();
        for (const split of exp.splits) {
            const splitUser = split.user.toString();
            if (splitUser === userId.toString()) continue; // skip your own split
            if (paidBy === userId.toString()) {
                // you paid, splitUser owes you
                balanceMap[splitUser] = (balanceMap[splitUser] || 0) + split.amount;
            }
        }
        // if someone else paid and you have a split
        const mySplit = exp.splits.find((s) => s.user.toString() === userId.toString());
        if (mySplit && paidBy !== userId.toString()) {
            balanceMap[paidBy] = (balanceMap[paidBy] || 0) - mySplit.amount;
        }
    }

    for (const s of settlements) {
        const pb = s.paidBy.toString();
        const pt = s.paidTo.toString();
        if (pb === userId.toString()) {
            // you paid someone → reduces what you owe them
            balanceMap[pt] = (balanceMap[pt] || 0) + s.amount;
        }
        if (pt === userId.toString()) {
            // someone paid you → reduces what they owe you
            balanceMap[pb] = (balanceMap[pb] || 0) - s.amount;
        }
    }

    // remove zeroes
    return Object.entries(balanceMap)
        .filter(([_, amt]) => amt !== 0)
        .map(([userId, amount]) => ({ userId, amount }));
}

export default getBalancesForUser;
