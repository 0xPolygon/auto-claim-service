import { Logger } from "@maticnetwork/chain-indexer-framework/logger";
import AutoClaimService from "./services/auto-claim.js";
import { ethers } from 'ethers';
import config from "./config/index.js";
import bridgeAbi from "./abi/bridge.js";
import { schedule } from "node-cron";
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

async function start() {
    try {

        const provider = new ethers.JsonRpcProvider(config.RPC_URL);
        const wallet = new ethers.Wallet(config.PRIVATE_KEY as string, provider);
        
        const contract = new ethers.Contract(
            config.BRIDGE_CONTRACT,
            bridgeAbi,
            wallet
        );
        
        let slackNotify = null;
        if (config.SLACK_URL) {
            slackNotify = new SlackNotify(config.SLACK_URL)
        }
        const autoClaimService = new AutoClaimService(
            config.NETWORK as string, 
            contract,
            new TransactionService(
                config.PROOF_URL,
                config.TRANSACTIONS_URL,
                config.SOURCE_NETWORKS,
                config.DESTINATION_NETWORK as string
            ),
            new GasStation(config.GAS_STATION_URL),
            slackNotify
        );

        // await autoClaimService.claimTransactions();
        schedule("*/1 * * * *", autoClaimService.claimTransactions.bind(autoClaimService));
    } catch (error) {
        // Logger.error({ error });
    }
};

start();
