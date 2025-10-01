import { Logger } from "@polygonlabs/servercore";
import AutoClaimService from "./services/auto-claim.js";
import { ethers } from 'ethers';
import config from "./config/index.js";
import bridgeAbi from "./abi/bridge.js";
import SlackNotify from "./services/slack-notify.js";
import GasStation from "./services/gas-station.js";
import TransactionService from "./services/transaction.js";

Logger.create({
    sentry: {
        dsn: config.LOGGER.SENTRY_DSN,
        level: 'error'
    },
    console: {
        level: "debug"
    }
});

let autoClaimService: AutoClaimService;
async function run() {
    while (true) {
        await autoClaimService.claimTransactions();
        await new Promise(r => setTimeout(r, 30000));
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
                config.BRIDGE_CONTRACT as string,
                bridgeAbi,
                wallet
            ),
            new TransactionService(
                config.BRIDGE_HUB_API_URL as string,
                config.SOURCE_NETWORKS,
                config.DESTINATION_NETWORK as string,
                ethersClients,
            ),
            new GasStation(config.GAS_STATION_URL as string),
            config.DESTINATION_NETWORK as string,
            slackNotify
        );

        run();
    } catch (error) {
        Logger.error({ error });
    }
};

start();
