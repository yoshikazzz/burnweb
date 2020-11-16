import axios, { AxiosInstance } from 'axios'
import abi from 'ethereumjs-abi'
import Common from 'ethereumjs-common';
import { Transaction } from 'ethereumjs-tx'

type BlockNumber = string | number;

class BurnWeb {
    private readonly axios: AxiosInstance;

    private readonly privateKey: Buffer;

    private _customCommon: Common = null;

    private async getCustomCommon(): Promise<Common> {
        if (this._customCommon === null) {
            const blockchain = (await this.axios.get('api/blockchain')).data

            this._customCommon = Common.forCustomChain(
                'mainnet',
                {
                    name: 'BURN',
                    networkId: blockchain['chain_id'],
                    chainId: blockchain['chain_id'],
                },
                'petersburg'
            )
        }

        return this._customCommon
    }

    constructor(url: string, privateKey: string | undefined) {
        this.axios = axios.create({
            baseURL: url,
            responseType: 'json'
        })

        this.axios.interceptors.response.use(function(response) {
            return response
        }, function(error) {
            console.log(error.response)
            if (error.response.status == 500) {
                return Promise.reject(new Error(error.response.data.message))
            }

            return Promise.reject(error)
        })

        if (privateKey !== undefined) {
            this.privateKey = Buffer.from(privateKey, 'hex')
        }
    }

    getBlockNumber(): Promise<number> {
        return this.axios.get('api/block_number').then((response) => {
            return response.data['block_number']
        })
    }

    getBlock(blockHashOrBlockNumber: BlockNumber | string): Promise<number> {
        return this.axios.get('api/blocks/' + blockHashOrBlockNumber).then((response) => {
            return response.data
        })
    }

    getBalance(address: string): Promise<string> {
        return this.axios.get('api/token/0x0000000000000000000000000000000000000000/balance/' + address).then((response) => {
            return response.data['balance']
        })
    }

    getTransaction(transactionHash: string): Promise<object> {
        return this.axios.get('api/transactions/' + transactionHash).then((response) => {
            return response.data
        })
    }

    async createToken(
        tokenId: string,
        name: string,
        symbol: string,
        decimals: number,
        totalSupply: string,
        feeTokenId: string,
        txFee: number,
        txFeeRate: number,
        icon: string,
        mintable: boolean,
        burnable: boolean
    ): Promise<string> {
        const data = abi.rawEncode(
            [ 'string', 'string', 'uint256', 'uint256', 'address', 'uint256', 'uint256', 'string', 'uint256', 'uint256' ],
            [ 
                name,
                symbol,
                decimals,
                totalSupply,
                feeTokenId,
                txFee,
                txFeeRate,
                icon,
                mintable,
                burnable
            ]
        )

        const nonce = Date.now();

        const txParams = {
            nonce: '0x' + nonce.toString(16),
            gasPrice: '0x0',
            gasLimit: '0x0',
            to: tokenId,
            value: '0x0',
            data: '0x78e2fc09' + data.toString('hex')
        }

        const tx = new Transaction(txParams, { common: await this.getCustomCommon() })
  
        tx.sign(this.privateKey);
  
        const signature = tx.v.toString('hex') + tx.r.toString('hex') + tx.s.toString('hex');
  
        return this.axios.post('api/token/create', {
            'token_id': tokenId,
            'name': name,
            "symbol": symbol,
            "decimals": decimals,
            "total_supply": totalSupply,
            "fee_token_id": feeTokenId,
            "tx_fee": txFee,
            "tx_fee_rate": txFeeRate,
            "icon": icon,
            "mintable": mintable,
            "burnable": burnable,
            "nonce": nonce,
            "signature": signature
        }).then((response) => {
            return response.data['tx_hash']
        });
    }

    async transferToken(
        tokenId: string,
        target: string,
        amount: number
    ): Promise<string> {
        const data = abi.rawEncode([ 'address', 'uint256' ], [ target, amount ])
        const nonce = Date.now();

        const txParams = {
            nonce: '0x' + nonce.toString(16),
            gasPrice: '0x0',
            gasLimit: '0x0',
            to: tokenId,
            value: '0x0',
            data: '0xa9059cbb' + data.toString('hex')
        }

        const tx = new Transaction(txParams, { common: await this.getCustomCommon() })
  
        tx.sign(this.privateKey);
  
        const signature = tx.v.toString('hex') + tx.r.toString('hex') + tx.s.toString('hex');
  
        return this.axios.post('api/token/' + tokenId + '/transfer', {
            'to': target,
            'value': amount,
            'nonce': nonce,
            'signature': signature
        }).then((response) => {
            return response.data['tx_hash']
        });
    }
}

export = BurnWeb
