import { Logger } from "@polygonlabs/servercore";
import AutoClaimService from "./services/auto-claim.js";
import { ethers, FetchRequest } from 'ethers';
import bridgeAbi from "./abi/bridge.js";
import SlackNotify from "./services/slack-notify.js";
import GasStation from "./services/gas-station.js";
import TransactionService from "./services/transaction.js";

Logger.create({
    sentry: {
        dsn: process.env.SENTRY_DSN,
        level: 'error'
    },
    console: {
        level: "debug"
    }
});

let autoClaimService: AutoClaimService;

const POLL_INTERVAL = 30000; // 30 seconds
async function run() {
    while (true) {
        try {
            await autoClaimService.claimTransactions();
        } catch (error) {
            Logger.error({ error, message: "Error claiming transactions" });
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
}

function createFetchRequest(chainId: string): FetchRequest {
    const rawRPCConfig = JSON.parse(process.env.RPC_CONFIG || "{}");
    const url = rawRPCConfig[chainId] || `${process.env.BASE_ERPC_URL}/${chainId}`;
    const fetchRequest = new FetchRequest(url);
    if (process.env.ERPC_API_KEY) {
        fetchRequest.setHeader("X-ERPC-Secret-Token", process.env.ERPC_API_KEY);
    }
    return fetchRequest;
}

function createEthersClients(): { [key: string]: ethers.JsonRpcProvider } {
    let ethersClients: { [key: string]: ethers.JsonRpcProvider } = {}
    const sourceNetworks = JSON.parse(process.env.SOURCE_NETWORKS || "[]");
    const sourceNetworkChainIds = JSON.parse(process.env.SOURCE_NETWORK_CHAINIDS || "[]");
    for (let index = 0; index < sourceNetworks.length; index += 1) {
        const fetchRequest = createFetchRequest(sourceNetworkChainIds[index]);
        ethersClients[sourceNetworks[index]] = new ethers.JsonRpcProvider(fetchRequest)
    }

    return ethersClients;
}

async function start() {
    try {
        const provider = new ethers.JsonRpcProvider(createFetchRequest(process.env.DESTINATION_NETWORK_CHAINID as string));
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
        const ethersClients = createEthersClients();

        const bridgeContract = new ethers.Contract(
            process.env.BRIDGE_CONTRACT as string,
            bridgeAbi,
            wallet
        );

        const transactionService = new TransactionService(
            process.env.BRIDGE_HUB_API_URL as string,
            process.env.SOURCE_NETWORKS as string,
            process.env.DESTINATION_NETWORK as string,
            ethersClients
        );

        autoClaimService = new AutoClaimService(
            bridgeContract,
            transactionService,
            new GasStation(process.env.GAS_STATION_URL as string),
            process.env.DESTINATION_NETWORK as string,
            process.env.SLACK_URL ? new SlackNotify(process.env.SLACK_URL) : null
        );

        run();
    } catch (error) {
        Logger.error({ location: "index.start", error });
    }
};

start();
