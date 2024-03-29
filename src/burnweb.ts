import axios, { AxiosInstance } from 'axios';
import abi from 'ethereumjs-abi';
import BN from 'bn.js';
import Common from 'ethereumjs-common';
import { Transaction } from 'ethereumjs-tx';
import Wallet from 'ethereumjs-wallet';
import querystring from 'querystring';

type BlockNumber = string | number;

export class BurnWeb {
    public static BN = BN;

    private readonly axios: AxiosInstance;

    private readonly privateKey: Buffer;

    private _customCommon: Common = null;

    private async getCustomCommon(): Promise<Common> {
        if (this._customCommon === null) {
            const blockchain = (await this.axios.get('api/blockchain')).data;

            this._customCommon = Common.forCustomChain(
                'mainnet',
                {
                    name: 'BURN',
                    networkId: blockchain['chain_id'],
                    chainId: blockchain['chain_id'],
                },
                'petersburg'
            );
        }

        return this._customCommon;
    }

    public static generateAccount(): { address: string; privateKey: string } {
        const wallet = Wallet.generate();

        return {
            address: wallet.getAddressString(),
            privateKey: wallet.getPrivateKeyString()
        };
    }

    public static privateKeyToAccount(privateKey: string): { address: string; privateKey: string } {
        if (!privateKey.startsWith('0x')) {
            privateKey = '0x' + privateKey;
        }

        if (privateKey.length !== 66) {
            throw new Error('Private key must be 32 bytes long');
        }

        const wallet = Wallet.fromPrivateKey(Buffer.from(privateKey.slice(2), 'hex'));

        return {
            address: wallet.getAddressString(),
            privateKey: wallet.getPrivateKeyString()
        };
    }

    constructor(url: string, privateKey?: string) {
        this.axios = axios.create({
            baseURL: url,
            responseType: 'json'
        });

        this.axios.interceptors.response.use(function(response) {
            return response;
        }, function(error) {
            console.log(error.response);
            if (error.response.status == 500) {
                return Promise.reject(new Error(error.response.data.message));
            }

            return Promise.reject(error);
        });

        if (privateKey !== undefined) {
            if (!privateKey.startsWith('0x')) {
                privateKey = '0x' + privateKey;
            }

            if (privateKey.length !== 66) {
                throw new Error('Private key must be 32 bytes long');
            }

            this.privateKey = Buffer.from(privateKey.slice(2), 'hex');
        }
    }

    getBlockNumber(): Promise<number> {
        return this.axios.get('api/block_number').then((response) => {
            return response.data['block_number'];
        });
    }

    getBlock(blockHashOrBlockNumber: BlockNumber | string): Promise<number> {
        return this.axios.get('api/blocks/' + blockHashOrBlockNumber).then((response) => {
            return response.data;
        });
    }

    getBalance(address: string): Promise<string> {
        return this.axios.get('api/token/0x0000000000000000000000000000000000000000/balance/' + address).then((response) => {
            return response.data['balance'];
        });
    }

    getBalanceOf(tokenId: string, address: string): Promise<string> {
        return this.axios.get('api/token/' + tokenId +'/balance/' + address).then((response) => {
            return response.data['balance'];
        });
    }

    getTransaction(transactionHash: string): Promise<object> {
        return this.axios.get('api/transactions/' + transactionHash).then((response) => {
            return response.data;
        });
    }

    getToken(tokenId: string): Promise<object> {
        return this.axios.get('api/token/' + tokenId).then((response) => {
            return response.data;
        });
    }

    async createToken(
        name: string,
        symbol: string,
        decimals: number,
        totalSupply: number|string|BN,
        feeToken: number,
        txFee: number,
        txFeeRate: number,
        icon: string,
        mintable: boolean,
        burnable: boolean
    ): Promise<{ txHash: string; tokenId: string }> {
        const totalSupplyBN = new BN(totalSupply);

        const tokenId = Wallet.generate().getAddressString();

        const data = abi.rawEncode(
            [ 'string', 'string', 'uint256', 'uint256', 'address', 'uint256', 'uint256', 'string', 'uint256', 'uint256' ],
            [ 
                name,
                symbol,
                decimals,
                totalSupplyBN,
                feeToken ? tokenId : '0x0000000000000000000000000000000000000000',
                txFee,
                txFeeRate,
                icon,
                mintable,
                burnable
            ]
        );

        const nonce = Date.now();

        const txParams = {
            nonce: '0x' + nonce.toString(16),
            gasPrice: '0x0',
            gasLimit: '0x0',
            to: tokenId,
            value: '0x0',
            data: '0x78e2fc09' + data.toString('hex')
        };

        const tx = new Transaction(txParams, { common: await this.getCustomCommon() });
  
        tx.sign(this.privateKey);
  
        const signature = tx.v.toString('hex') + tx.r.toString('hex').padStart(64, '0') + tx.s.toString('hex').padStart(64, '0');
  
        return this.axios.post('api/token/create', {
            'token_id': tokenId,
            'name': name,
            'symbol': symbol,
            'decimals': decimals,
            'total_supply': totalSupplyBN.toString(10),
            'fee_token_id': feeToken ? tokenId : '0x0000000000000000000000000000000000000000',
            'tx_fee': txFee,
            'tx_fee_rate': txFeeRate,
            'icon': icon,
            'mintable': mintable,
            'burnable': burnable,
            'nonce': nonce,
            'signature': signature
        }).then((response) => {
            return {
                txHash: response.data['tx_hash'],
                tokenId: tokenId
            };
        });
    }

    async transferToken(
        tokenId: string,
        target: string,
        amount: number|string|BN
    ): Promise<string> {
        const amountBN = new BN(amount);

        let txParams;
        const nonce = Date.now();

        if (tokenId !== '0x0000000000000000000000000000000000000000') {
            const data = abi.rawEncode([ 'address', 'uint256' ], [ target, amountBN ]);

            txParams = {
                nonce: '0x' + nonce.toString(16),
                gasPrice: '0x0',
                gasLimit: '0x0',
                to: tokenId,
                value: '0x0',
                data: '0xa9059cbb' + data.toString('hex')
            };
        } else {
            txParams = {
                nonce: '0x' + nonce.toString(16),
                gasPrice: '0x0',
                gasLimit: '0x0',
                to: target,
                value: amountBN,
                data: '0x'
            };
        }

        const tx = new Transaction(txParams, { common: await this.getCustomCommon() });
  
        tx.sign(this.privateKey);
  
        const signature = tx.v.toString('hex') + tx.r.toString('hex').padStart(64, '0') + tx.s.toString('hex').padStart(64, '0');
  
        return this.axios.post('api/token/' + tokenId + '/transfer', {
            'to': target,
            'value': amountBN.toString(10),
            'nonce': nonce,
            'signature': signature
        }).then((response) => {
            return response.data['tx_hash'];
        });
    }

    async issueToken(
        tokenId: string,
        target: string,
        amount: number|string|BN
    ): Promise<string> {
        const amountBN = new BN(amount);

        const data = abi.rawEncode([ 'address', 'uint256' ], [ target, amountBN ]);
        const nonce = Date.now();

        const txParams = {
            nonce: '0x' + nonce.toString(16),
            gasPrice: '0x0',
            gasLimit: '0x0',
            to: tokenId,
            value: '0x0',
            data: '0x40c10f19' + data.toString('hex')
        };

        const tx = new Transaction(txParams, { common: await this.getCustomCommon() });
  
        tx.sign(this.privateKey);
  
        const signature = tx.v.toString('hex') + tx.r.toString('hex').padStart(64, '0') + tx.s.toString('hex').padStart(64, '0');
  
        return this.axios.post('api/token/' + tokenId + '/issue', {
            'to': target,
            'value': amountBN.toString(10),
            'nonce': nonce,
            'signature': signature
        }).then((response) => {
            return response.data['tx_hash'];
        });
    }

    async burnToken(
        tokenId: string,
        amount: number|string|BN
    ): Promise<string> {
        const amountBN = new BN(amount);

        const data = abi.rawEncode([ 'uint256' ], [ amountBN ]);
        const nonce = Date.now();

        const txParams = {
            nonce: '0x' + nonce.toString(16),
            gasPrice: '0x0',
            gasLimit: '0x0',
            to: tokenId,
            value: '0x0',
            data: '0x42966c68' + data.toString('hex')
        };

        const tx = new Transaction(txParams, { common: await this.getCustomCommon() });
  
        tx.sign(this.privateKey);
  
        const signature = tx.v.toString('hex') + tx.r.toString('hex').padStart(64, '0') + tx.s.toString('hex').padStart(64, '0');
  
        return this.axios.post('api/token/' + tokenId + '/burn', {
            'value': amountBN.toString(10),
            'nonce': nonce,
            'signature': signature
        }).then((response) => {
            return response.data['tx_hash'];
        });
    }

    async listTokenTransactions(
        tokenId: string,
        from?: string,
        to?: string,
        start?: Date,
        end?: Date
    ): Promise<object[]> {
        const params = { };

        if (from) {
            params['from'] = from;
        }

        if (to) {
            params['to'] = to;
        }

        if (start) {
            params['start'] = start.toISOString().substr(0, 10) + ' ' + start.toISOString().substr(11, 8);
        }

        if (end) {
            params['end'] = end.toISOString().substr(0, 10) + ' ' + end.toISOString().substr(11, 8);
        }

        return this.axios.get('api/token/' + tokenId + '/tx?' + querystring.stringify(params)).then((response) => {
            return response.data;
        });
    }

    async createStore(name: string): Promise<{ txHash: string; storeId: string }> {
        const data = abi.rawEncode(
            [ 'string', 'address', 'uint256' ],
            [ name, '0x0000000000000000000000000000000000000000', '0' ]
        );

        const storeId = Wallet.generate().getAddressString();
        const nonce = Date.now();

        const txParams = {
            nonce: '0x' + nonce.toString(16),
            gasPrice: '0x0',
            gasLimit: '0x0',
            to: storeId,
            value: '0x0',
            data: '0x06dc8de5' + data.toString('hex')
        };

        const tx = new Transaction(txParams, { common: await this.getCustomCommon() });
  
        tx.sign(this.privateKey);
  
        const signature = tx.v.toString('hex') + tx.r.toString('hex').padStart(64, '0') + tx.s.toString('hex').padStart(64, '0');
  
        return this.axios.post('api/kvs/create', {
            'store_id': storeId,
            'name': name,
            'fee_token_id': '0x0000000000000000000000000000000000000000',
            'tx_fee': 0,
            'nonce': nonce,
            'signature': signature
        }).then((response) => {
            return {
                txHash: response.data['tx_hash'],
                storeId: storeId
            };
        });
    }

    async setKeyValue(storeId: string, collection: string, key: string, value: string): Promise<{ txHash: string }> {
        const data = abi.rawEncode(
            [ 'string', 'string', 'string' ],
            [ collection, key, value ]
        );

        const nonce = Date.now();

        const txParams = {
            nonce: '0x' + nonce.toString(16),
            gasPrice: '0x0',
            gasLimit: '0x0',
            to: storeId,
            value: '0x0',
            data: '0xc6be612d' + data.toString('hex')
        };

        const tx = new Transaction(txParams, { common: await this.getCustomCommon() });
  
        tx.sign(this.privateKey);
  
        const signature = tx.v.toString('hex') + tx.r.toString('hex').padStart(64, '0') + tx.s.toString('hex').padStart(64, '0');
  
        return this.axios.post('api/kvs/' + storeId + '/collections/' + collection, {
            'store_id': storeId,
            'key': key,
            'value': value,
            'nonce': nonce,
            'signature': signature
        }).then((response) => {
            return {
                txHash: response.data['tx_hash']
            };
        });
    }

    async getKeyValue(storeId: string, collection: string, key: string): Promise<string> {
        return this.axios.get('api/kvs/' + storeId + '/collections/' + collection + '/keys/' + key + '/value').then((response) => {
            return response.data['value'];
        });
    }

    async deleteKeyValue(storeId: string, collection: string, key: string): Promise<{ txHash: string }> {
        const data = abi.rawEncode(
            [ 'string', 'string' ],
            [ collection, key ]
        );

        const nonce = Date.now();

        const txParams = {
            nonce: '0x' + nonce.toString(16),
            gasPrice: '0x0',
            gasLimit: '0x0',
            to: storeId,
            value: '0x0',
            data: '0x668f1f1b' + data.toString('hex')
        };

        const tx = new Transaction(txParams, { common: await this.getCustomCommon() });
  
        tx.sign(this.privateKey);
  
        const signature = tx.v.toString('hex') + tx.r.toString('hex').padStart(64, '0') + tx.s.toString('hex').padStart(64, '0');
  
        return this.axios.delete('api/kvs/' + storeId + '/collections/' + collection, {
            data: {
                'store_id': storeId,
                'key': key,
                'nonce': nonce,
                'signature': signature
            }
        }).then((response) => {
            return {
                txHash: response.data['tx_hash']
            };
        });
    }
}
