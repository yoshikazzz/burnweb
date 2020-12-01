const { BurnWeb } = require('../burnweb');

test('generateAccount', () => {
    const account = BurnWeb.generateAccount();

    expect(account.address).toMatch(/^0x[0-9a-f]{40}/);
    expect(account.privateKey).toMatch(/^0x[0-9a-f]{64}/);
});

test('privateKeyToAddress', () => {
    const account = BurnWeb.generateAccount();

    expect(BurnWeb.privateKeyToAccount(account.privateKey).address).toEqual(account.address);
});
