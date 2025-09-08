import axios from 'axios';
import { ethers } from 'ethers';
import AbiCoder from "web3-eth-abi";
import { Logger } from '@maticnetwork/chain-indexer-framework';
import { IProof } from "../types/index.js";

const _GLOBAL_INDEX_MAINNET_FLAG = BigInt(2 ** 64);

export default class TransactionService {

    constructor(
        private bridgeHubAPIUrl: string,
        private sourceNetworks: string,
        private destinationNetwork: string,
        private ethersClients: { [key: string]: ethers.JsonRpcProvider },
    ) { }

    async getPendingTransactions(): Promise<any[]> {
        Logger.info({
            location: 'TransactionService',
            function: 'getPendingTransactions',
            call: 'started'
        })
        let transactions: any[] = [];
        try {
            let sourceNetworkIds = "";
            JSON.parse(this.sourceNetworks).forEach((networkId: number) => {
                sourceNetworkIds = `${sourceNetworkIds}&sourceNetworkIds=${networkId}`
            })
            let transactionData = await axios.get(
                `${this.bridgeHubAPIUrl}/transactions?destinationNetworkIds=${this.destinationNetwork}${sourceNetworkIds}&status=READY_TO_CLAIM&pageSize=1000`
            );
            if (transactionData && transactionData.data && transactionData.data.data) {
                transactions = transactionData.data.data;
                transactions = transactions.filter(obj => !(
                    obj.leafType === 'MESSAGE' && obj.amount === '0'
                ))
            }
        } catch (error: any) {
            Logger.error({
                location: 'TransactionService',
                function: 'getPendingTransactions',
                error: error.message
            });
        }

        Logger.info({
            location: 'TransactionService',
            function: 'getPendingTransactions',
            call: 'completed',
            length: transactions.length
        })
        return transactions;

    }

    private computeGlobalIndex(indexLocal: number, sourceNetworkId: number) {
        if (BigInt(sourceNetworkId) === BigInt(0)) {
            return BigInt(indexLocal) + _GLOBAL_INDEX_MAINNET_FLAG;
        } else {
            return BigInt(indexLocal) + BigInt(sourceNetworkId - 1) * BigInt(2 ** 32);
        }
    }

    async getTransactionPayload(
        transactionHash: string, sourceNetwork: number, counter: number
    ) {
        const transaction = await this.ethersClients[sourceNetwork].getTransactionReceipt(transactionHash);
        if (transaction) {
            let logs = transaction.logs.filter(obj => obj.topics[0].toLowerCase() === '0x501781209a1f8899323b96b4ef08b168df93e0a90c673d1e4cce39366cb62f9b'.toLowerCase())
            logs = logs.filter(obj => (AbiCoder as any).decodeParameters(
                ["uint8", "uint32", "address", "uint32", "address", "uint256", "bytes", "uint32"],
                obj.data
            )[7] === counter.toString())
            if (logs.length) {
                let data = (AbiCoder as any).decodeParameters(
                    ["uint8", "uint32", "address", "uint32", "address", "uint256", "bytes", "uint32"],
                    logs[0].data
                )
                return {
                    globalIndex: this.computeGlobalIndex(data[7], sourceNetwork).toString(),
                    originNetwork: data[1],
                    originTokenAddress: data[2],
                    destinationNetwork: data[3],
                    destinationAddress: data[4],
                    amount: data[5],
                    metadata: data[6] || '0x',
                }
            }
        }
        return null;
    }

    async getProof(sourceNetwork: number, depositCount: number, leafIndex: number): Promise<IProof | null> {
        let proof: IProof | null = null;
        try {
            let proofData = await axios.get(
                `${this.bridgeHubAPIUrl}/claim-proof?sourceNetworkId=${sourceNetwork}&leafIndex=${leafIndex}&depositCount=${depositCount}`
            );
            if (
                proofData && proofData.data && proofData.data.proof &&
                proofData.data.proof.merkle_proof && !proofData.data.proof.merkle_proof.message
            ) {
                proof = proofData.data.proof;
            }
        } catch (error: any) {
            Logger.error({
                location: 'TransactionService',
                function: 'getProof',
                error: error.message,
                data: {
                    sourceNetwork,
                    depositCount,
                    url: `${this.bridgeHubAPIUrl}/claim-proof?sourceNetworkId=${sourceNetwork}&leafIndex=${leafIndex}&depositCount=${depositCount}`
                }
            });
        }
        return proof;
    }
}
