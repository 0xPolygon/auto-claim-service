import { Logger } from '@maticnetwork/chain-indexer-framework';
import { ITransaction } from '@maticnetwork/bridge-api-common/interfaces/transaction';
import { ethers } from 'ethers';
import SlackNotify from './slack-notify.js';
import { IProof } from "../types/index.js";
import GasStation from './gas-station.js';
import TransactionService from "./transaction.js";
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
     * @param {ethers.Contract} contract
     */
    constructor(
        private network: string,
        private contract: ethers.Contract,
        private transactionService: TransactionService,
        private gasStation: GasStation,
        private slackNotify: SlackNotify | null = null
    ) { }

    computeGlobalIndex(indexLocal: number, sourceNetworkId: number): BigInt {
        if (BigInt(sourceNetworkId) === BigInt(0)) {
            return BigInt(indexLocal) + _GLOBAL_INDEX_MAINNET_FLAG;
        } else {
            return BigInt(indexLocal) + BigInt(sourceNetworkId - 1) * BigInt(2 ** 32);
        }
    }

    async claim(transaction: ITransaction, proof: IProof, globalIndex: BigInt, gasPrice: number): Promise<ethers.TransactionResponse | null> {
        let tx: ethers.TransactionResponse | null = null;
        try {
            if (transaction.dataType === 'ERC20') {
                Logger.info({
                    type: 'claimAsset',
                    sourceNetwork: transaction.sourceNetwork,
                    depositIndex: transaction.counter,
                    bridgeTxHash: transaction.transactionHash
                })
                tx = await this.contract.claimAsset(
                    proof.merkle_proof,
                    proof.rollup_merkle_proof,
                    globalIndex.toString(),
                    proof.main_exit_root,
                    proof.rollup_exit_root,
                    transaction.originTokenNetwork,
                    transaction.originTokenAddress,
                    transaction.destinationNetwork,
                    transaction.receiver,
                    transaction.amounts ? transaction.amounts[0] : '0',
                    transaction.metadata && transaction.metadata !== "" ? transaction.metadata : '0x',
                    { gasPrice }
                )

            } else {
                Logger.info({
                    type: 'claimMessage',
                    sourceNetwork: transaction.sourceNetwork,
                    depositIndex: transaction.counter,
                    bridgeTxHash: transaction.transactionHash
                })
                tx = await this.contract.claimMessage(
                    proof.merkle_proof,
                    proof.rollup_merkle_proof,
                    globalIndex.toString(),
                    proof.main_exit_root,
                    proof.rollup_exit_root,
                    '0',
                    transaction.transactionInitiator,
                    transaction.destinationNetwork,
                    transaction.receiver,
                    transaction.originTokenAddress ? '0' : transaction.amounts ? transaction.amounts[0] : '0',
                    transaction.metadata && transaction.metadata !== "" ? transaction.metadata : '0x',
                    { gasPrice }
                )
            }
        } catch (error) {
            Logger.error({ error })
        }
        return tx;
    }

    async claimTransactions() {
        try {
            Logger.info({
                location: 'AutoClaimService',
                function: 'claimTransactions',
                call: 'started'
            })
            const transactions = await this.transactionService.getPendingTransactions();

            for (const transaction of transactions) {
                const proof = await this.transactionService.getProof(transaction.sourceNetwork, transaction.counter as number)
                const globalIndex = this.computeGlobalIndex(transaction.counter as number, transaction.sourceNetwork);
                const gasPrice = await this.gasStation.getGasPrice();
                if (proof) {
                    let tx = await this.claim(transaction, proof, globalIndex, gasPrice);

                    if (tx && this.slackNotify) {
                        await this.slackNotify.notifyAdmin({
                            network: this.network,
                            claimType: transaction.dataType as string,
                            bridgeTxHash: transaction.transactionHash as string,
                            sourceNetwork: transaction.sourceNetwork,
                            destinationNetwork: transaction.destinationNetwork,
                            claimTxHash: tx.hash,
                            depositIndex: transaction.counter as number
                        });

                        Logger.info({
                            type: 'transactionCompleted',
                            bridgeTxHash: transaction.transactionHash,
                            sourceNetwork: transaction.sourceNetwork,
                            hash: tx.hash,
                            depositIndex: transaction.counter
                        })
                    }
                }
            }
            Logger.info({
                location: 'AutoClaimService',
                function: 'claimTransactions',
                call: 'completed'
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
