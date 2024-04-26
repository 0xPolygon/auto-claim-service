import { config } from "dotenv";

config();

export default {
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    SOURCE_NETWORKS: process.env.SOURCE_NETWORKS || '[]',
    DESTINATION_NETWORK: process.env.DESTINATION_NETWORKS,
    TRANSACTIONS_URL: process.env.TRANSACTIONS_URL || 'https://bridge-api-testnet-dev.polygon.technology/transactions',
    PROOF_URL: process.env.PROOF_URL || 'https://bridge-api-testnet-dev.polygon.technology/merkle-proof',
    RPC_URL: process.env.DESTINATION_NETWORKS || 'https://rpc.cardona.zkevm-rpc.com',
    BRIDGE_CONTRACT: process.env.BRIDGE_CONTRACT || '0x528e26b25a34a4A5d0dbDa1d57D318153d2ED582',
    GAS_STATION_URL: process.env.GAS_STATION_URL || 'https://gasstation.polygon.technology/zkevm',
    LOGGER: {
        SENTRY_DSN: process.env.SENTRY_DSN,
        SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
        DATADOG_API_KEY: process.env.DATADOG_API_KEY,
        DATADOG_APP_KEY: process.env.DATADOG_APP_KEY,
    }
};
