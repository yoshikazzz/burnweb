const { default: Wallet } = require('ethereumjs-wallet');

const BurnWeb = require('../');

test('createToken', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const token = Wallet.generate();

    const txHash = await burnweb.createToken(
        token.getAddressString(),
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

    expect(txHash).toMatch(/^0x[0-9a-f]{40}/);
});

test('transferToken', async () => {
    const burnweb = new BurnWeb('https://burn-network.io', 'c4d25b4def6bdf58cdacfff3b03a0304a9f2aa29d1357b5ae0ad28c54102898b');

    const token = Wallet.generate();

    await burnweb.createToken(
        token.getAddressString(),
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

    const target = Wallet.generate();

    const txHash =  await burnweb.transferToken(token.getAddressString(), target.getAddressString(), 100);

    expect(txHash).toMatch(/^0x[0-9a-f]{40}/);
});
