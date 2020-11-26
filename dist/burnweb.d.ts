declare type BlockNumber = string | number;
export declare class BurnWeb {
    private readonly axios;
    private readonly privateKey;
    private _customCommon;
    private getCustomCommon;
    constructor(url: string, privateKey?: string);
    getBlockNumber(): Promise<number>;
    getBlock(blockHashOrBlockNumber: BlockNumber | string): Promise<number>;
    getBalance(address: string): Promise<string>;
    getBalanceOf(tokenId: string, address: string): Promise<string>;
    getTransaction(transactionHash: string): Promise<object>;
    getToken(tokenId: string): Promise<object>;
    createToken(name: string, symbol: string, decimals: number, totalSupply: string, feeTokenId: string, txFee: number, txFeeRate: number, icon: string, mintable: boolean, burnable: boolean): Promise<{
        txHash: string;
        tokenId: string;
    }>;
    transferToken(tokenId: string, target: string, amount: number): Promise<string>;
    issueToken(tokenId: string, target: string, amount: number): Promise<string>;
    burnToken(tokenId: string, amount: number): Promise<string>;
    createStore(name: string): Promise<{
        txHash: string;
        storeId: string;
    }>;
    setKeyValue(storeId: string, collection: string, key: string, value: string): Promise<{
        txHash: string;
    }>;
    getKeyValue(storeId: string, collection: string, key: string): Promise<string>;
    deleteKeyValue(storeId: string, collection: string, key: string): Promise<{
        txHash: string;
    }>;
}
export {};
