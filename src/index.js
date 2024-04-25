import { Logger } from "@maticnetwork/chain-indexer-framework/logger";
import AutoClaimService from "./services/auto-claim.js";
import { ethers } from 'ethers';
import config from "./config/index.js";
import bridgeAbi from "./abi/bridge.js";

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

        const autoClaimService = new AutoClaimService(contract);

        await autoClaimService.claimTransactions();
    } catch (error) {
        // Logger.error(error as Error);
    }
};

start();
