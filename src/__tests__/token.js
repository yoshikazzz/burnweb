const { default: Wallet } = require('ethereumjs-wallet');

const { BurnWeb } = require('../burnweb');

test('createToken', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { txHash } = await burnweb.createToken(
        'Name',
        'USDN',
        6,
        '20000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        0,
        0,
        'https://s3.aws.com/11980234/219315.png',
        1,
        0
    );

    expect(txHash).toMatch(/^0x[0-9a-f]{40}/);
});

test('getToken', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { tokenId } = await burnweb.createToken(
        'Name',
        'USDN',
        6,
        '20000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        0,
        0,
        'https://s3.aws.com/11980234/219315.png',
        1,
        0
    );

    const info =  await burnweb.getToken(tokenId);

    expect(info['token_id']).toEqual(tokenId);
});

test('transferToken', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { tokenId } = await burnweb.createToken(
        'Name',
        'USDN',
        6,
        '20000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        0,
        0,
        'https://s3.aws.com/11980234/219315.png',
        1,
        0
    );

    const target = Wallet.generate();

    const txHash =  await burnweb.transferToken(tokenId, target.getAddressString(), '10000000000000000000000000');

    expect(txHash).toMatch(/^0x[0-9a-f]{40}/);
});

test('transferToken native', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const target = Wallet.generate();

    const txHash =  await burnweb.transferToken('0x0000000000000000000000000000000000000000', target.getAddressString(), '1');

    expect(txHash).toMatch(/^0x[0-9a-f]{40}/);
});

test('issueToken', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { tokenId } = await burnweb.createToken(
        'Name',
        'USDN',
        6,
        '20000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        0,
        0,
        'https://s3.aws.com/11980234/219315.png',
        1,
        0
    );

    const target = Wallet.generate();

    const txHash =  await burnweb.issueToken(tokenId, target.getAddressString(), 100);
    const targetBalance = await burnweb.getBalanceOf(tokenId, target.getAddressString());
    const tokenInfo = await burnweb.getToken(tokenId);

    expect(txHash).toMatch(/^0x[0-9a-f]{40}/);
    expect(targetBalance).toEqual('100');
    expect(tokenInfo['total_supply']).toEqual('20000000000000000000000100');
});

test('burnToken', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { tokenId } = await burnweb.createToken(
        'Name',
        'USDN',
        6,
        '20000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        0,
        0,
        'https://s3.aws.com/11980234/219315.png',
        1,
        1
    );

    const txHash =  await burnweb.burnToken(tokenId, 100);
    const balance = await burnweb.getBalanceOf(tokenId, '0x3a762D996BBB3633c653e1DCb0201663874Dc9E2');
    const tokenInfo = await burnweb.getToken(tokenId);

    expect(txHash).toMatch(/^0x[0-9a-f]{40}/);
    expect(balance).toEqual('19999999999999999999999900');
    expect(tokenInfo['total_supply']).toEqual('19999999999999999999999900');
});

test('getBalanceOf', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { tokenId } = await burnweb.createToken(
        'Name',
        'USDN',
        6,
        '20000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        0,
        0,
        'https://s3.aws.com/11980234/219315.png',
        1,
        0
    );

    expect(await burnweb.getBalanceOf(tokenId, '0x3a762D996BBB3633c653e1DCb0201663874Dc9E2')).toEqual('20000000000000000000000000');
});

test('listTokenTransactions', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const { tokenId } = await burnweb.createToken(
        'Name',
        'USDN',
        6,
        '20000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        0,
        0,
        'https://s3.aws.com/11980234/219315.png',
        1,
        0
    );

    const target = Wallet.generate();

    const txHash =  await burnweb.transferToken(tokenId, target.getAddressString(), '10000000000000000000000000');

    const start = new Date(Date.now() - 3600 * 1000);
    const end = new Date(Date.now() + 3600 * 1000);

    expect((await burnweb.listTokenTransactions(tokenId, undefined, target.getAddressString(), start, end))[0]['tx_id']).toEqual(txHash);
});
