function minimiseTransactions(balanceMap) {
    // balanceMap = { userId: netAmount }
    // positive = owed to this person, negative = this person owes

    const creditors = []; // people who are owed
    const debtors = []; // people who owe

    for (const [userId, amount] of Object.entries(balanceMap)) {
        if (amount > 0.01) creditors.push({ userId, amount });
        if (amount < -0.01) debtors.push({ userId, amount: Math.abs(amount) });
    }

    // sort descending so largest amounts settle first
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions = [];

    let i = 0,
        j = 0;
    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amount = Math.min(debtor.amount, creditor.amount);

        transactions.push({
            from: debtor.userId, // this person pays
            to: creditor.userId, // this person receives
            amount: Math.round(amount * 100) / 100,
        });

        debtor.amount -= amount;
        creditor.amount -= amount;

        if (debtor.amount < 0.01) i++; // debtor is settled
        if (creditor.amount < 0.01) j++; // creditor is settled
    }

    return transactions;
}

export default minimiseTransactions;
