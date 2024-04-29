import axios from 'axios';
import { INotifyParams } from "../types/index.js";

export default class SlackNotify {

    constructor(private slackWebhookUrl: string) {}

    async notifyAdmin(params: INotifyParams) {
        await axios.post(this.slackWebhookUrl, {
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "Claim " + params.claimType + " Details: " + params.sourceNetwork + "-" + params.depositIndex,
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*Network:* " + params.network,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*sourceNetwork:* " + params.sourceNetwork,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*bridgeTxHash:* " + params.bridgeTxHash,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*destinationNetwork:* " + params.destinationNetwork,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*claimTxHash:* " + params.claimTxHash,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*depositIndex:* " + params.depositIndex,
                    },
                },
                {
                    type: "divider"
                },
            ],
        });
    }
}
