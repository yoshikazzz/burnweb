const { default: Wallet } = require('ethereumjs-wallet');

const BurnWeb = require('../');

test('createStore', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { txHash, storeId } = await burnweb.createStore('Name');

    expect(txHash).toMatch(/^0x[0-9a-f]{40}/);
    expect(storeId).toMatch(/^0x[0-9a-f]{40}/);
});

test('setKeyValue', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { storeId } = await burnweb.createStore('Name');

    const { txHash } = await burnweb.setKeyValue(storeId, 'collection', 'key', 'value');

    expect(txHash).toMatch(/^0x[0-9a-f]{40}/);
});

test('getKeyValue', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { storeId } = await burnweb.createStore('Name');

    await burnweb.setKeyValue(storeId, 'collection', 'key', 'value');
    const value = await burnweb.getKeyValue(storeId, 'collection', 'key');

    expect(value).toEqual('value');
});

test('deleteKeyValue', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { storeId } = await burnweb.createStore('Name');

    await burnweb.setKeyValue(storeId, 'collection', 'key', 'value');
    await burnweb.deleteKeyValue(storeId, 'collection', 'key');

    const value = await burnweb.getKeyValue(storeId, 'collection', 'key');

    expect(value).toBeUndefined();
});
