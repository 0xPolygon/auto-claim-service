import { Logger } from '@maticnetwork/chain-indexer-framework';
import axios from 'axios';
import { ethers } from 'ethers';
const _GLOBAL_INDEX_MAINNET_FLAG = BigInt(2 ** 64);

/**
 * AutoClaimService service class is a class which has function to autoclaim transactions
 * 
 * @class AutoClaimService
 */
export default class AutoClaimService {
    /**
     * @constructor
     * 
     * @param {string} transactionUrl 
     * @param {string} proofUrl
     * @param {ethers.Contract} contract
     */
    constructor(
        private transactionUrl: string,
        private proofUrl: string,
        private contract: ethers.Contract,
        private gasStationUrl: string
    ) { }

    async getPendingTransactions(): Promise<any> {
        Logger.info({
            location: 'AutoClaimService',
            function: 'getPendingTransactions',
            call: 'started'
        })
        let transactions = [];
        try {
            let transactionData = await axios.get(`${this.transactionUrl}?userAddress=&sourceNetworkIds=2&destinationNetworkIds=1`);
            if (transactionData && transactionData.data && transactionData.data.result) {
                transactions = transactionData.data.result.filter((obj: any) => obj.status === 'READY_TO_CLAIM');
            }
        } catch (error: any) {
            Logger.error({ error: error.message });
        }

        Logger.info({
            location: 'AutoClaimService',
            function: 'getPendingTransactions',
            call: 'completed',
            data: transactions.length
        })
        return transactions;

    }

    async getProof(depositCount: number): Promise<any> {
        Logger.info({
            location: 'AutoClaimService',
            function: 'getProof',
            call: 'started',
            data: {
                depositCount
            }
        })
        let proof = null;
        try {
            let proofData = await axios.get(`${this.proofUrl}?networkId=${2}&depositCount=${depositCount}`);
            if (
                proofData && proofData.data && proofData.data.proof &&
                proofData.data.proof.merkle_proof && !proofData.data.proof.merkle_proof.message
            ) {
                proof = proofData.data.proof;
            }
        } catch (error) {
            Logger.error({ error });
        }
        Logger.info({
            location: 'AutoClaimService',
            function: 'getProof',
            call: 'completed'
        })
        return proof;
    }

    computeGlobalIndex(indexLocal: number, sourceNetworkId: number) {
        if (BigInt(sourceNetworkId) === BigInt(0)) {
            return BigInt(indexLocal) + _GLOBAL_INDEX_MAINNET_FLAG;
        } else {
            return BigInt(indexLocal) + BigInt(sourceNetworkId - 1) * BigInt(2 ** 32);
        }
    }

    async getGasPrice(): Promise<any> {
        try {
            let price = await axios.get(`${this.gasStationUrl}/zkevm`);
            if (
                price && price.data && price.data.fast
            ) {
                return price.data.fast * (10 ** 9)
            }
        } catch (error) {
            Logger.error({ error });
            return 2000000000;
        }
    }

    async claimTransactions(): Promise<void> {
        try {
            Logger.info({
                location: 'AutoClaimService',
                function: 'claimTransactions',
                call: 'started'
            })
            const transactions = await this.getPendingTransactions();

            for (const transaction of transactions) {
                const proof = await this.getProof(transaction.counter)
                const globalIndex = this.computeGlobalIndex(transaction.counter, transaction.sourceNetwork);
                const gasPrice = await this.getGasPrice();
                if (proof) {
                    if (transaction.dataType === 'ERC20') {
                        Logger.info({
                            type: 'claimAsset',
                            depositIndex: transaction.counter
                        })
                        const tx = await this.contract.claimAsset(
                            proof.merkle_proof,
                            proof.rollup_merkle_proof,
                            globalIndex.toString(),
                            proof.main_exit_root,
                            proof.rollup_exit_root,
                            transaction.originTokenNetwork,
                            transaction.originTokenAddress,
                            transaction.destinationNetwork,
                            transaction.receiver,
                            transaction.amounts[0],
                            transaction.metadata && transaction.metadata !== "" ? transaction.metadata : '0x',
                            { gasPrice }
                        )
                        Logger.info({
                            type: 'transactionCompleted',
                            hash: tx.hash,
                            depositIndex: transaction.counter
                        })
                    } else {
                        Logger.info({
                            type: 'claimMessage',
                            depositIndex: transaction.counter
                        })
                        const tx = await this.contract.claimMessage(
                            proof.merkle_proof,
                            proof.rollup_merkle_proof,
                            globalIndex,
                            proof.main_exit_root,
                            proof.rollup_exit_root,
                            '0',
                            transaction.transactionInitiator,
                            transaction.destinationNetwork,
                            transaction.receiver,
                            transaction.originTokenAddress ? '0' : transaction.amounts[0],
                            transaction.metadata && transaction.metadata !== "" ? transaction.metadata : '0x',
                            { gasPrice }
                        )
                        Logger.info({
                            type: 'transactionCompleted',
                            hash: tx.hash,
                            depositIndex: transaction.counter
                        })
                    }
                }
            }
            Logger.info({
                location: 'AutoClaimService',
                function: 'claimTransactions',
                call: 'compelted'
            })
            return;
        }
        catch (error) {
            Logger.error({ error });
            throw error;
        }
    }
}
