"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BurnWeb = void 0;
const axios_1 = __importDefault(require("axios"));
const ethereumjs_abi_1 = __importDefault(require("ethereumjs-abi"));
const bn_js_1 = __importDefault(require("bn.js"));
const ethereumjs_common_1 = __importDefault(require("ethereumjs-common"));
const ethereumjs_tx_1 = require("ethereumjs-tx");
const ethereumjs_wallet_1 = __importDefault(require("ethereumjs-wallet"));
const querystring_1 = __importDefault(require("querystring"));
class BurnWeb {
    constructor(url, privateKey) {
        this._customCommon = null;
        this.axios = axios_1.default.create({
            baseURL: url,
            responseType: 'json'
        });
        this.axios.interceptors.response.use(function (response) {
            return response;
        }, function (error) {
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
    getCustomCommon() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._customCommon === null) {
                const blockchain = (yield this.axios.get('api/blockchain')).data;
                this._customCommon = ethereumjs_common_1.default.forCustomChain('mainnet', {
                    name: 'BURN',
                    networkId: blockchain['chain_id'],
                    chainId: blockchain['chain_id'],
                }, 'petersburg');
            }
            return this._customCommon;
        });
    }
    static generateAccount() {
        const wallet = ethereumjs_wallet_1.default.generate();
        return {
            address: wallet.getAddressString(),
            privateKey: wallet.getPrivateKeyString()
        };
    }
    static privateKeyToAccount(privateKey) {
        if (!privateKey.startsWith('0x')) {
            privateKey = '0x' + privateKey;
        }
        if (privateKey.length !== 66) {
            throw new Error('Private key must be 32 bytes long');
        }
        const wallet = ethereumjs_wallet_1.default.fromPrivateKey(Buffer.from(privateKey.slice(2), 'hex'));
        return {
            address: wallet.getAddressString(),
            privateKey: wallet.getPrivateKeyString()
        };
    }
    getBlockNumber() {
        return this.axios.get('api/block_number').then((response) => {
            return response.data['block_number'];
        });
    }
    getBlock(blockHashOrBlockNumber) {
        return this.axios.get('api/blocks/' + blockHashOrBlockNumber).then((response) => {
            return response.data;
        });
    }
    getBalance(address) {
        return this.axios.get('api/token/0x0000000000000000000000000000000000000000/balance/' + address).then((response) => {
            return response.data['balance'];
        });
    }
    getBalanceOf(tokenId, address) {
        return this.axios.get('api/token/' + tokenId + '/balance/' + address).then((response) => {
            return response.data['balance'];
        });
    }
    getTransaction(transactionHash) {
        return this.axios.get('api/transactions/' + transactionHash).then((response) => {
            return response.data;
        });
    }
    getToken(tokenId) {
        return this.axios.get('api/token/' + tokenId).then((response) => {
            return response.data;
        });
    }
    createToken(name, symbol, decimals, totalSupply, feeToken, txFee, txFeeRate, icon, mintable, burnable) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalSupplyBN = new bn_js_1.default(totalSupply);
            const tokenId = ethereumjs_wallet_1.default.generate().getAddressString();
            const data = ethereumjs_abi_1.default.rawEncode(['string', 'string', 'uint256', 'uint256', 'address', 'uint256', 'uint256', 'string', 'uint256', 'uint256'], [
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
            ]);
            const nonce = Date.now();
            const txParams = {
                nonce: '0x' + nonce.toString(16),
                gasPrice: '0x0',
                gasLimit: '0x0',
                to: tokenId,
                value: '0x0',
                data: '0x78e2fc09' + data.toString('hex')
            };
            const tx = new ethereumjs_tx_1.Transaction(txParams, { common: yield this.getCustomCommon() });
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
        });
    }
    transferToken(tokenId, target, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountBN = new bn_js_1.default(amount);
            let txParams;
            const nonce = Date.now();
            if (tokenId !== '0x0000000000000000000000000000000000000000') {
                const data = ethereumjs_abi_1.default.rawEncode(['address', 'uint256'], [target, amountBN]);
                txParams = {
                    nonce: '0x' + nonce.toString(16),
                    gasPrice: '0x0',
                    gasLimit: '0x0',
                    to: tokenId,
                    value: '0x0',
                    data: '0xa9059cbb' + data.toString('hex')
                };
            }
            else {
                txParams = {
                    nonce: '0x' + nonce.toString(16),
                    gasPrice: '0x0',
                    gasLimit: '0x0',
                    to: target,
                    value: amountBN,
                    data: '0x'
                };
            }
            const tx = new ethereumjs_tx_1.Transaction(txParams, { common: yield this.getCustomCommon() });
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
        });
    }
    issueToken(tokenId, target, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountBN = new bn_js_1.default(amount);
            const data = ethereumjs_abi_1.default.rawEncode(['address', 'uint256'], [target, amountBN]);
            const nonce = Date.now();
            const txParams = {
                nonce: '0x' + nonce.toString(16),
                gasPrice: '0x0',
                gasLimit: '0x0',
                to: tokenId,
                value: '0x0',
                data: '0x40c10f19' + data.toString('hex')
            };
            const tx = new ethereumjs_tx_1.Transaction(txParams, { common: yield this.getCustomCommon() });
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
        });
    }
    burnToken(tokenId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const amountBN = new bn_js_1.default(amount);
            const data = ethereumjs_abi_1.default.rawEncode(['uint256'], [amountBN]);
            const nonce = Date.now();
            const txParams = {
                nonce: '0x' + nonce.toString(16),
                gasPrice: '0x0',
                gasLimit: '0x0',
                to: tokenId,
                value: '0x0',
                data: '0x42966c68' + data.toString('hex')
            };
            const tx = new ethereumjs_tx_1.Transaction(txParams, { common: yield this.getCustomCommon() });
            tx.sign(this.privateKey);
            const signature = tx.v.toString('hex') + tx.r.toString('hex').padStart(64, '0') + tx.s.toString('hex').padStart(64, '0');
            return this.axios.post('api/token/' + tokenId + '/burn', {
                'value': amountBN.toString(10),
                'nonce': nonce,
                'signature': signature
            }).then((response) => {
                return response.data['tx_hash'];
            });
        });
    }
    listTokenTransactions(tokenId, from, to, start, end) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {};
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
            return this.axios.get('api/token/' + tokenId + '/tx?' + querystring_1.default.stringify(params)).then((response) => {
                return response.data;
            });
        });
    }
    createStore(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = ethereumjs_abi_1.default.rawEncode(['string', 'address', 'uint256'], [name, '0x0000000000000000000000000000000000000000', '0']);
            const storeId = ethereumjs_wallet_1.default.generate().getAddressString();
            const nonce = Date.now();
            const txParams = {
                nonce: '0x' + nonce.toString(16),
                gasPrice: '0x0',
                gasLimit: '0x0',
                to: storeId,
                value: '0x0',
                data: '0x06dc8de5' + data.toString('hex')
            };
            const tx = new ethereumjs_tx_1.Transaction(txParams, { common: yield this.getCustomCommon() });
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
        });
    }
    setKeyValue(storeId, collection, key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = ethereumjs_abi_1.default.rawEncode(['string', 'string', 'string'], [collection, key, value]);
            const nonce = Date.now();
            const txParams = {
                nonce: '0x' + nonce.toString(16),
                gasPrice: '0x0',
                gasLimit: '0x0',
                to: storeId,
                value: '0x0',
                data: '0xc6be612d' + data.toString('hex')
            };
            const tx = new ethereumjs_tx_1.Transaction(txParams, { common: yield this.getCustomCommon() });
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
        });
    }
    getKeyValue(storeId, collection, key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.axios.get('api/kvs/' + storeId + '/collections/' + collection + '/keys/' + key + '/value').then((response) => {
                return response.data['value'];
            });
        });
    }
    deleteKeyValue(storeId, collection, key) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = ethereumjs_abi_1.default.rawEncode(['string', 'string'], [collection, key]);
            const nonce = Date.now();
            const txParams = {
                nonce: '0x' + nonce.toString(16),
                gasPrice: '0x0',
                gasLimit: '0x0',
                to: storeId,
                value: '0x0',
                data: '0x668f1f1b' + data.toString('hex')
            };
            const tx = new ethereumjs_tx_1.Transaction(txParams, { common: yield this.getCustomCommon() });
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
        });
    }
}
exports.BurnWeb = BurnWeb;
BurnWeb.BN = bn_js_1.default;
//# sourceMappingURL=burnweb.js.map