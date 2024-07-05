import axios from 'axios';
import { INotifyParams } from "../types/index.js";

export default class SlackNotify {

    constructor(private slackWebhookUrl: string) { }

    async notifyAdminForError(params: INotifyParams) {
        await axios.post(this.slackWebhookUrl, {
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text:
                            "```SourceNetwork: " + params.sourceNetwork + " \n" +
                            "BridgeTxHash: " + params.bridgeTxHash + "\n" +
                            "DestinationNetwork: " + params.destinationNetwork + "\n" +
                            "DepositIndex: " + params.depositIndex + "\n" +
                            "Error: " + params.error + "```"
                    }
                },
                {
                    type: "divider"
                }
            ],
        });
    }

    async notifyAdminForSuccess(claimTxHash: string) {
        await axios.post(this.slackWebhookUrl, {
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*transactionHash:* " + claimTxHash,
                    },
                },
                {
                    type: "divider"
                },
            ],
        });
    }
}
