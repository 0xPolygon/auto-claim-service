import { Logger } from '@maticnetwork/chain-indexer-framework';
import { ITransaction } from '@maticnetwork/bridge-api-common/interfaces/transaction';
import { ethers } from 'ethers';
import SlackNotify from './slack-notify.js';
import { IProof } from "../types/index.js";
import GasStation from './gas-station.js';
import TransactionService from "./transaction.js";
const _GLOBAL_INDEX_MAINNET_FLAG = BigInt(2 ** 64);

let failedTx: { [key: number]: number } = {};

/**
 * AutoClaimService service class is a class which has function to autoclaim transactions
 * 
 * @class AutoClaimService
 */
export default class AutoClaimService {
    /**
     * @constructor
     * 
     * @param {string} network
     * @param {ethers.Contract} compressContract
     * @param {ethers.Contract} bridgeContract
     * @param {TransactionService} transactionService
     * @param {GasStation} gasStation
     * @param {string} destinationNetwork
     * @param {SlackNotify | null} slackNotify
     */
    constructor(
        private network: string,
        private compressContract: ethers.Contract,
        private bridgeContract: ethers.Contract,
        private transactionService: TransactionService,
        private gasStation: GasStation,
        private destinationNetwork: string,
        private slackNotify: SlackNotify | null = null
    ) { }

    computeGlobalIndex(indexLocal: number, sourceNetworkId: number): BigInt {
        if (BigInt(sourceNetworkId) === BigInt(0)) {
            return BigInt(indexLocal) + _GLOBAL_INDEX_MAINNET_FLAG;
        } else {
            return BigInt(indexLocal) + BigInt(sourceNetworkId - 1) * BigInt(2 ** 32);
        }
    }

    async estimateGas(transaction: ITransaction, proof: IProof, globalIndex: BigInt): Promise<boolean> {
        try {
            if (transaction.dataType === 'ERC20') {
                await this.bridgeContract.claimAsset.estimateGas(
                    proof.merkle_proof,
                    proof.rollup_merkle_proof,
                    globalIndex.toString(),
                    proof.main_exit_root,
                    proof.rollup_exit_root,
                    transaction.originTokenNetwork,
                    transaction.originTokenAddress,
                    this.destinationNetwork,
                    transaction.receiver,
                    transaction.amounts ? transaction.amounts[0] : '0',
                    transaction.metadata && transaction.metadata !== "" ? transaction.metadata : '0x'
                )
            } else {
                await this.bridgeContract.claimMessage.estimateGas(
                    proof.merkle_proof,
                    proof.rollup_merkle_proof,
                    globalIndex.toString(),
                    proof.main_exit_root,
                    proof.rollup_exit_root,
                    '0',
                    transaction.transactionInitiator,
                    this.destinationNetwork,
                    transaction.receiver,
                    transaction.originTokenAddress ? '0' : transaction.amounts ? transaction.amounts[0] : '0',
                    transaction.metadata && transaction.metadata !== "" ? transaction.metadata : '0x',
                )
            }

            return true;
        } catch (error: any) {
            if (!transaction.counter) {
                return false;
            }

            if (failedTx[transaction.counter]) {
                failedTx[transaction.counter] = failedTx[transaction.counter] + 1;
            } else {
                failedTx[transaction.counter] = 1;
            }

            if (
                this.slackNotify &&
                failedTx[transaction.counter] &&
                (failedTx[transaction.counter] - 1) % 25 === 0 &&
                failedTx[transaction.counter] <= 51
            ) {
                await this.slackNotify.notifyAdminForError({
                    claimType: transaction.dataType as string,
                    bridgeTxHash: transaction.transactionHash as string,
                    sourceNetwork: transaction.sourceNetwork,
                    destinationNetwork: transaction.destinationNetwork,
                    error: error.message ? error.message.slice(0, 100) : '',
                    depositIndex: transaction.counter
                });
            }

            return false;
        }
    }

    async claim(batch: { transaction: ITransaction, proof: IProof, globalIndex: BigInt }[]): Promise<ethers.TransactionResponse | null> {
        const gasPrice = await this.gasStation.getGasPrice();
        let response: ethers.TransactionResponse | null = null;
        try {
            Logger.info({
                type: 'claimBatch',
                transactionHashes: batch.map(obj => obj.transaction.transactionHash)
            })

            const main_exit_root = batch[0].proof.main_exit_root;
            const rollup_exit_root = batch[0].proof.rollup_exit_root;
            const data = []
            for (const tx of batch) {
                if (tx.transaction.dataType === 'ERC20') {
                    data.push({
                        smtProofLocalExitRoot: tx.proof.merkle_proof,
                        smtProofRollupExitRoot: tx.proof.rollup_merkle_proof,
                        globalIndex: tx.globalIndex.toString(),
                        originNetwork: tx.transaction.originTokenNetwork,
                        originAddress: tx.transaction.originTokenAddress,
                        destinationAddress: tx.transaction.receiver,
                        amount: tx.transaction.amounts ? tx.transaction.amounts[0] : '0',
                        metadata: tx.transaction.metadata && tx.transaction.metadata !== "" ? tx.transaction.metadata : '0x',
                        isMessage: false
                    })
                } else {
                    data.push({
                        smtProofLocalExitRoot: tx.proof.merkle_proof,
                        smtProofRollupExitRoot: tx.proof.rollup_merkle_proof,
                        globalIndex: tx.globalIndex.toString(),
                        originNetwork: '0',
                        originAddress: tx.transaction.transactionInitiator,
                        destinationAddress: tx.transaction.receiver,
                        amount: tx.transaction.originTokenAddress ? '0' : tx.transaction.amounts ? tx.transaction.amounts[0] : '0',
                        metadata: tx.transaction.metadata && tx.transaction.metadata !== "" ? tx.transaction.metadata : '0x',
                        isMessage: true
                    })
                }
            }

            response = await this.compressContract.compressClaimCall(
                main_exit_root,
                rollup_exit_root,
                data,
                { gasPrice }
            )
            response = await this.compressContract.sendCompressedClaims(response)

            Logger.info({
                type: 'claimBatch',
                status: 'success',
                claimTransactionHash: response?.hash
            })
        } catch (error: any) {
            Logger.error({ error })
        }
        return response;
    }

    async claimTransactions() {
        try {
            Logger.info({
                location: 'AutoClaimService',
                function: 'claimTransactions',
                call: 'started'
            })
            const transactions = await this.transactionService.getPendingTransactions();

            let finalClaimableTransaction = [];
            for (const transaction of transactions) {
                const proof = await this.transactionService.getProof(transaction.sourceNetwork, transaction.counter as number)
                const globalIndex = this.computeGlobalIndex(transaction.counter as number, transaction.sourceNetwork);

                if (proof) {
                    let estimateGas = await this.estimateGas(transaction, proof, globalIndex);
                    if (estimateGas) {
                        finalClaimableTransaction.push({
                            transaction,
                            proof,
                            globalIndex
                        })
                    }
                }
            }

            Logger.info({
                location: 'AutoClaimService',
                function: 'claimTransactions',
                call: 'finalClaimableTransaction length',
                data: finalClaimableTransaction.length
            })
            const length = finalClaimableTransaction.length;
            for (let i = 0; i < length; i += 5) {
                const batch = finalClaimableTransaction.slice(i, i + 5);
                await this.claim(batch);
            }

            Logger.info({
                location: 'AutoClaimService',
                function: 'claimTransactions',
                call: 'compelted'
            })
            return;
        }
        catch (error: any) {
            Logger.error({
                location: 'AutoClaimService',
                function: 'claimTransactions',
                error: error.message ? error.message : error
            });
            throw error;
        }
    }
}
