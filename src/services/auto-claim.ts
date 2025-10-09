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
     * @param {ethers.Contract} bridgeContract
     * @param {TransactionService} transactionService
     * @param {GasStation} gasStation
     * @param {string} destinationNetwork
     * @param {SlackNotify | null} slackNotify
     */
    constructor(
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

    async sendTransaction(transaction: ITransaction, proof: IProof, globalIndex: BigInt): Promise<boolean | ethers.TransactionResponse> {
        const bridgeDetails = {
            transactionHash: transaction.transactionHash,
            sourceNetwork: transaction.sourceNetwork,
            depositCount: transaction.depositCount
        };

        try {
            Logger.info({
                location: 'AutoClaimService.sendTransaction.start',
                bridgeDetails
            })

            const transactionPayload = await this.transactionService.getTransactionPayload(
                transaction.transactionHash as string,
                transaction.sourceNetwork,
                transaction.depositCount
            )

            if (!transactionPayload) {
                Logger.info({
                    location: 'AutoClaimService.sendTransaction.payloadError',
                    bridgeDetails,
                })
                return false;
            }

            let tx = null;

            if (transaction.leafType === 'ASSET') {
                tx = await this.bridgeContract.claimAsset(
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
                tx = await this.bridgeContract.claimMessage(
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

            Logger.info({
                location: 'AutoClaimService.sendTransaction.completed',
                message: `claim hash: ${tx.hash}`
            })
            return tx;

        } catch (error: any) {
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
                Logger.error({
                    location: 'AutoClaimService.slackNotify',
                    error: error?.message || error
                })
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

    async claimTransactions() {
        try {
            Logger.info({
                location: 'AutoClaimService.claimTransactions',
                call: 'started'
            })
            let transactions = await this.transactionService.getPendingTransactions();

            for (const transaction of transactions) {
                if (!transaction.leafIndexForProof) {
                    continue;
                }
                const proof = await this.transactionService.getProof(transaction.sourceNetwork, transaction.depositCount, transaction.leafIndexForProof)
                const globalIndex = transaction.globalIndex ?? this.computeGlobalIndex(transaction.depositCount as number, transaction.sourceNetwork);
                if (proof) {
                    await this.sendTransaction(transaction, proof, globalIndex);
                }
            }

            Logger.info({
                location: 'AutoClaimService.claimTransactions',
                call: 'completed'
            })
            return;
        }
        catch (error: any) {
            Logger.error({
                location: 'AutoClaimService.claimTransactions',
                error: error.message ? error.message : error
            });
            throw error;
        }
    }
}
