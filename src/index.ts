import { Logger } from "@maticnetwork/chain-indexer-framework/logger";
import AutoClaimService from "./services/auto-claim.js";
import { ethers } from 'ethers';
import config from "./config/index.js";
import claimCompressorAbi from "./abi/claim_compressor.js";
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
        await new Promise(r => setTimeout(r, 120000));
    }
}

async function start() {
    try {

        const provider = new ethers.JsonRpcProvider(config.RPC_URL);
        const wallet = new ethers.Wallet(config.PRIVATE_KEY as string, provider);

        const contract = new ethers.Contract(
            config.CLAIM_COMPRESSOR_CONTRACT as string,
            claimCompressorAbi,
            wallet
        );

        let slackNotify = null;
        if (config.SLACK_URL) {
            slackNotify = new SlackNotify(config.SLACK_URL)
        }
        autoClaimService = new AutoClaimService(
            config.NETWORK as string,
            contract,
            new TransactionService(
                config.PROOF_URL as string,
                config.TRANSACTIONS_URL as string,
                config.SOURCE_NETWORKS,
                config.DESTINATION_NETWORK as string,
                config.TRANSACTIONS_API_KEY,
                config.PROOF_API_KEY
            ),
            new GasStation(config.GAS_STATION_URL as string,),
            slackNotify
        );

        run();
    } catch (error) {
        // Logger.error({ error });
    }
};

start();
