import { Logger } from "@maticnetwork/chain-indexer-framework/logger";
import AutoClaimService from "./services/auto-claim.js";
import { ethers } from 'ethers';
import config from "./config/index.js";
import claimCompressorAbi from "./abi/claim_compressor.js";
import bridgeAbi from "./abi/bridge.js";
import SlackNotify from "./services/slack-notify.js";
import GasStation from "./services/gas-station.js";
import TransactionService from "./services/transaction.js";

Logger.create({
    sentry: {
        dsn: config.LOGGER.SENTRY_DSN,
        level: 'error'
    },
    datadog: {
        api_key: config.LOGGER.DATADOG_API_KEY,
        service_name: config.LOGGER.DATADOG_APP_KEY
    },
    console: {
        level: "debug"
    }
});

let autoClaimService: AutoClaimService;
async function run() {
    while (true) {
        await autoClaimService.claimTransactions();
        await new Promise(r => setTimeout(r, 15000));
    }
}

async function start() {
    try {

        const provider = new ethers.JsonRpcProvider(config.RPC_URL);
        const wallet = new ethers.Wallet(config.PRIVATE_KEY as string, provider);

        let slackNotify = null;
        if (config.SLACK_URL) {
            slackNotify = new SlackNotify(config.SLACK_URL)
        }

        let ethersClients: { [key: string]: ethers.JsonRpcProvider } = {}
        for (let index = 0; index < JSON.parse(config.SOURCE_NETWORKS).length; index += 1) {
            ethersClients[JSON.parse(config.SOURCE_NETWORKS)[index]] = new ethers.JsonRpcProvider(JSON.parse(config.SOURCE_NETWORKS_RPC)[index])
        }

        autoClaimService = new AutoClaimService(
            new ethers.Contract(
                config.CLAIM_COMPRESSOR_CONTRACT as string,
                claimCompressorAbi,
                wallet
            ),
            new ethers.Contract(
                config.BRIDGE_CONTRACT as string,
                bridgeAbi,
                wallet
            ),
            new TransactionService(
                config.PROOF_URL as string,
                config.TRANSACTIONS_URL as string,
                config.SOURCE_NETWORKS,
                config.DESTINATION_NETWORK as string,
                ethersClients,
                config.API_GATEWAY_API_KEY
            ),
            new GasStation(config.GAS_STATION_URL as string),
            config.DESTINATION_NETWORK as string,
            slackNotify
        );

        run();
    } catch (error) {
        // Logger.error({ error });
    }
};

start();
