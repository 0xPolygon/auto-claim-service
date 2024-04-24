import { Logger } from "@maticnetwork/chain-indexer-framework/logger";
import AutoClaimService from "./services/auto-claim.js";
import { ethers } from 'ethers';
import dotenv from "dotenv";

dotenv.config();

Logger.create({
    sentry: {
        dsn: process.env.SENTRY_DSN,
        level: 'error'
    },
    datadog: {
        api_key: process.env.DATADOG_API_KEY,
        service_name: process.env.DATADOG_APP_KEY
    },
    console: {
        level: "debug"
    }
});

async function start(): Promise<void> {
    try {

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL as string);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

        const contract = new ethers.Contract(
            process.env.BRIDGE_CONTRACT as string,
            [
                {
                    "inputs": [
                        {
                            "internalType": "bytes32[32]",
                            "name": "smtProofLocalExitRoot",
                            "type": "bytes32[32]"
                        },
                        {
                            "internalType": "bytes32[32]",
                            "name": "smtProofRollupExitRoot",
                            "type": "bytes32[32]"
                        },
                        {
                            "internalType": "uint256",
                            "name": "globalIndex",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bytes32",
                            "name": "mainnetExitRoot",
                            "type": "bytes32"
                        },
                        {
                            "internalType": "bytes32",
                            "name": "rollupExitRoot",
                            "type": "bytes32"
                        },
                        {
                            "internalType": "uint32",
                            "name": "originNetwork",
                            "type": "uint32"
                        },
                        {
                            "internalType": "address",
                            "name": "originTokenAddress",
                            "type": "address"
                        },
                        {
                            "internalType": "uint32",
                            "name": "destinationNetwork",
                            "type": "uint32"
                        },
                        {
                            "internalType": "address",
                            "name": "destinationAddress",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "amount",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bytes",
                            "name": "metadata",
                            "type": "bytes"
                        }
                    ],
                    "name": "claimAsset",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "bytes32[32]",
                            "name": "smtProofLocalExitRoot",
                            "type": "bytes32[32]"
                        },
                        {
                            "internalType": "bytes32[32]",
                            "name": "smtProofRollupExitRoot",
                            "type": "bytes32[32]"
                        },
                        {
                            "internalType": "uint256",
                            "name": "globalIndex",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bytes32",
                            "name": "mainnetExitRoot",
                            "type": "bytes32"
                        },
                        {
                            "internalType": "bytes32",
                            "name": "rollupExitRoot",
                            "type": "bytes32"
                        },
                        {
                            "internalType": "uint32",
                            "name": "originNetwork",
                            "type": "uint32"
                        },
                        {
                            "internalType": "address",
                            "name": "originAddress",
                            "type": "address"
                        },
                        {
                            "internalType": "uint32",
                            "name": "destinationNetwork",
                            "type": "uint32"
                        },
                        {
                            "internalType": "address",
                            "name": "destinationAddress",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "amount",
                            "type": "uint256"
                        },
                        {
                            "internalType": "bytes",
                            "name": "metadata",
                            "type": "bytes"
                        }
                    ],
                    "name": "claimMessage",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
            ],
            wallet
        );

        const autoClaimService = new AutoClaimService(
            process.env.TRANSACTIONS_URL as string,
            process.env.PROOF_URL as string,
            contract,
            process.env.GAS_STATION_URL as string
        )

        await autoClaimService.claimTransactions();
    } catch (error) {
        // Logger.error(error as Error);
    }
};

start();
