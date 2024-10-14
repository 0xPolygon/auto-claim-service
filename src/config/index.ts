import { config } from "dotenv";

config();

export default {
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    SOURCE_NETWORKS: process.env.SOURCE_NETWORKS || '[]',
    SOURCE_NETWORKS_RPC: process.env.SOURCE_NETWORKS_RPC || '[]',
    DESTINATION_NETWORK: process.env.DESTINATION_NETWORK,
    TRANSACTIONS_URL: process.env.TRANSACTIONS_URL,
    API_GATEWAY_API_KEY: process.env.API_GATEWAY_API_KEY,
    PROOF_URL: process.env.PROOF_URL,
    RPC_URL: process.env.RPC_URL,
    BRIDGE_CONTRACT: process.env.BRIDGE_CONTRACT,
    CLAIM_COMPRESSOR_CONTRACT: process.env.CLAIM_COMPRESSOR_CONTRACT,
    GAS_STATION_URL: process.env.GAS_STATION_URL,
    SLACK_URL: process.env.SLACK_URL,
    NETWORK: process.env.NETWORK,
    LOGGER: {
        SENTRY_DSN: process.env.SENTRY_DSN,
        SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
        DATADOG_API_KEY: process.env.DATADOG_API_KEY,
        DATADOG_APP_KEY: process.env.DATADOG_APP_KEY,
    }
};
