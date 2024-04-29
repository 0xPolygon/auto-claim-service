import { Logger } from "@maticnetwork/chain-indexer-framework/logger";
import AutoClaimService from "./services/auto-claim.js";
import { ethers } from 'ethers';
import config from "./config/index.js";
import bridgeAbi from "./abi/bridge.js";
import { schedule } from "node-cron";
import SlackNotify from "./services/slack-notify.js";

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
        const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
        
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
            config.NETWORK, contract, slackNotify
        );

        // await autoClaimService.claimTransactions();
        schedule("*/1 * * * *", autoClaimService.claimTransactions.bind(autoClaimService));
    } catch (error) {
        // Logger.error({ error });
    }
};

start();
