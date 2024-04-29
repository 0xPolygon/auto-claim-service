import axios from 'axios';
import { Logger } from '@maticnetwork/chain-indexer-framework';
import { IProof } from "../types/index.js";
import { ITransaction } from '@maticnetwork/bridge-api-common/interfaces/transaction';

export default class TransactionService {

    constructor(
        private proofUrl: string,
        private transactionUrl: string,
        private sourceNetworks: string,
        private destinationNetwork: string,
    ) { }

    async getPendingTransactions(): Promise<ITransaction[]> {
        Logger.info({
            location: 'AutoClaimService',
            function: 'getPendingTransactions',
            call: 'started'
        })
        let transactions: ITransaction[] = [];
        try {
            let sourceNetworkIds = "";
            JSON.parse(this.sourceNetworks).forEach((networkId: number) => {
                sourceNetworkIds = `${sourceNetworkIds}&sourceNetworkIds=${networkId}`
            })
            let transactionData = await axios.get(
                `${this.transactionUrl}?userAddress=${sourceNetworkIds}&destinationNetworkIds=${this.destinationNetwork}&status=READY_TO_CLAIM`
            );
            if (transactionData && transactionData.data && transactionData.data.result) {
                transactions = transactionData.data.result;
            }
        } catch (error: any) {
            Logger.error({
                location: 'AutoClaimService',
                function: 'getPendingTransactions',
                error: error.message
            });
        }

        Logger.info({
            location: 'AutoClaimService',
            function: 'getPendingTransactions',
            call: 'completed',
            length: transactions.length
        })
        return transactions;

    }

    async getProof(sourceNetwork: number, depositCount: number): Promise<IProof | null> {
        Logger.info({
            location: 'AutoClaimService',
            function: 'getProof',
            call: 'started',
            data: {
                depositCount
            }
        })
        let proof: IProof | null = null;
        try {
            let proofData = await axios.get(`${this.proofUrl}?networkId=${sourceNetwork}&depositCount=${depositCount}`);
            if (
                proofData && proofData.data && proofData.data.proof &&
                proofData.data.proof.merkle_proof && !proofData.data.proof.merkle_proof.message
            ) {
                proof = proofData.data.proof;
            }
        } catch (error: any) {
            Logger.error({
                location: 'AutoClaimService',
                function: 'getProof',
                error: error.message,
                data: {
                    sourceNetwork,
                    depositCount
                }
            });
        }
        Logger.info({
            location: 'AutoClaimService',
            function: 'getProof',
            call: 'completed'
        })
        return proof;
    }
}
