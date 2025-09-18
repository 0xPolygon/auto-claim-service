import { Logger } from '@polygonlabs/servercore';
import { ITransaction } from '../types/index.js';
import { ethers } from 'ethers';
import SlackNotify from './slack-notify.js';
import { IProof } from "../types/index.js";
import GasStation from './gas-station.js';
import TransactionService from "./transaction.js";
const _GLOBAL_INDEX_MAINNET_FLAG = BigInt(2 ** 64);

let failedTx: { [key: number]: number } = {};
let completedTx: { [key: number]: number } = {};
/**
 * AutoClaimService service class is a class which has function to autoclaim transactions
 * 
 * @class AutoClaimService
 */
export default class AutoClaimService {
    /**
     * @constructor
     * 
     * @param {ethers.Contract} compressContract
     * @param {ethers.Contract} bridgeContract
     * @param {TransactionService} transactionService
     * @param {GasStation} gasStation
     * @param {string} destinationNetwork
     * @param {SlackNotify | null} slackNotify
     */
    constructor(
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
            const transactionPayload = await this.transactionService.getTransactionPayload(
                transaction.transactionHash as string,
                transaction.sourceNetwork,
                transaction.depositCount
            )
            if (!transactionPayload) {
                return false;
            }

            if (transaction.leafType === 'ASSET') {
                await this.bridgeContract.claimAsset.estimateGas(
                    proof.proof_local_exit_root,
                    proof.proof_rollup_exit_root,
                    globalIndex.toString(),
                    proof.l1_info_tree_leaf.mainnet_exit_root,
                    proof.l1_info_tree_leaf.rollup_exit_root,
                    transactionPayload.originNetwork,
                    transactionPayload.originTokenAddress,
                    transactionPayload.destinationNetwork,
                    transactionPayload.destinationAddress,
                    transactionPayload.amount,
                    transactionPayload.metadata || '0x'
                )
            } else {
                await this.bridgeContract.claimMessage.estimateGas(
                    proof.proof_local_exit_root,
                    proof.proof_rollup_exit_root,
                    transactionPayload.globalIndex.toString(),
                    proof.l1_info_tree_leaf.mainnet_exit_root,
                    proof.l1_info_tree_leaf.rollup_exit_root,
                    transactionPayload.originNetwork,
                    transactionPayload.originTokenAddress,
                    transactionPayload.destinationNetwork,
                    transactionPayload.destinationAddress,
                    transactionPayload.amount,
                    transactionPayload.metadata
                )
            }

            return true;
        } catch (error: any) {
            console.log(error)
            if (!transaction.depositCount) {
                return false;
            }

            if (failedTx[transaction.depositCount]) {
                failedTx[transaction.depositCount] = failedTx[transaction.depositCount] + 1;
            } else {
                failedTx[transaction.depositCount] = 1;
            }

            if (
                this.slackNotify &&
                failedTx[transaction.depositCount] &&
                failedTx[transaction.depositCount] === 25 &&
                completedTx[transaction.sourceNetwork] &&
                completedTx[transaction.sourceNetwork] > transaction.depositCount
            ) {
                await this.slackNotify.notifyAdminForError({
                    claimType: transaction.leafType,
                    bridgeTxHash: transaction.transactionHash,
                    sourceNetwork: transaction.sourceNetwork,
                    destinationNetwork: transaction.destinationNetwork,
                    error: error.message ? error.message.slice(0, 100) : '',
                    depositIndex: transaction.depositCount
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

            const main_exit_root = batch[0].proof.l1_info_tree_leaf.mainnet_exit_root;
            const rollup_exit_root = batch[0].proof.l1_info_tree_leaf.rollup_exit_root;
            const data = []
            for (const tx of batch) {
                const transactionPayload = await this.transactionService.getTransactionPayload(
                    tx.transaction.transactionHash,
                    tx.transaction.sourceNetwork,
                    tx.transaction.depositCount
                )

                if (!transactionPayload) {
                    continue;
                }

                if (tx.transaction.leafType === 'ASSET') {
                    data.push({
                        smtProofLocalExitRoot: tx.proof.proof_local_exit_root,
                        smtProofRollupExitRoot: tx.proof.proof_rollup_exit_root,
                        globalIndex: tx.globalIndex.toString(),
                        originNetwork: transactionPayload.originNetwork,
                        originAddress: transactionPayload.originTokenAddress,
                        destinationAddress: transactionPayload.destinationAddress,
                        amount: transactionPayload.amount,
                        metadata: transactionPayload.metadata || '0x',
                        isMessage: false
                    })
                } else {
                    data.push({
                        smtProofLocalExitRoot: tx.proof.proof_local_exit_root,
                        smtProofRollupExitRoot: tx.proof.proof_rollup_exit_root,
                        globalIndex: transactionPayload.globalIndex.toString(),
                        originNetwork: transactionPayload.originNetwork,
                        originAddress: transactionPayload.originTokenAddress,
                        destinationAddress: transactionPayload.destinationAddress,
                        amount: transactionPayload.amount,
                        metadata: transactionPayload.metadata,
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
            for (const tx of batch) {
                if (
                    !completedTx[tx.transaction.sourceNetwork] ||
                    (
                        completedTx[tx.transaction.sourceNetwork] &&
                        tx.transaction.depositCount &&
                        (completedTx[tx.transaction.sourceNetwork] || 0) < tx.transaction.depositCount
                    )
                ) {
                    completedTx[tx.transaction.sourceNetwork] = tx.transaction.depositCount || -1;
                }
            }

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
            let transactions = await this.transactionService.getPendingTransactions();

            let finalClaimableTransaction = [];
            for (const transaction of transactions) {
                if (!transaction.leafIndex) {
                    continue;
                }
                const proof = await this.transactionService.getProof(transaction.sourceNetwork, transaction.depositCount, transaction.leafIndex)
                const globalIndex = transaction.globalIndex ?? this.computeGlobalIndex(transaction.depositCount as number, transaction.sourceNetwork);
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
            for (let i = 0; i < finalClaimableTransaction.length; i += 5) {
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
