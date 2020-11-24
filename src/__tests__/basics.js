const { default: Wallet } = require('ethereumjs-wallet');

const { BurnWeb } = require('../');

test('setProvider', () => {
    const burnweb = new BurnWeb('https://burn-network.io');
});

test('getBlockNumber', async () => {
    const burnweb = new BurnWeb('https://burn-network.io');

    expect(await burnweb.getBlockNumber()).toBeGreaterThanOrEqual(0);
});

test('getBlock', async () => {
    const burnweb = new BurnWeb('https://burn-network.io');

    const blockNumber = await burnweb.getBlockNumber();
    expect((await burnweb.getBlock(blockNumber))['block_number']).toEqual(blockNumber);
});

test('getBalance', async () => {
    const burnweb = new BurnWeb('https://burn-network.io');

    expect(await burnweb.getBalance('0x407d73d8a49eeb85d32cf465507dd71d507100c1')).toEqual('0');
});

test('getTransaction', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { txHash } = await burnweb.createToken(
        'Name',
        'USDN',
        6,
        20000000000000,
        '0x0000000000000000000000000000000000000000',
        0,
        0,
        'https://s3.aws.com/11980234/219315.png',
        1,
        0,
        1234
    );

    const tx = await burnweb.getTransaction(txHash);

    expect(tx['tx_id']).toEqual(txHash);
});
