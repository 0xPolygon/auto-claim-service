import axios from 'axios';
import { Logger } from '@maticnetwork/chain-indexer-framework';

export default class GasStation {

    constructor(private gasStationUrl: string) { }

    async getGasPrice(): Promise<number> {
        try {
            let price = await axios.get(`${this.gasStationUrl}`);
            if (
                price && price.data && price.data.fast
            ) {
                return price.data.fast * (10 ** 9);
            }
        } catch (error: any) {
            Logger.error({
                location: 'AutoClaimService',
                function: 'getGasPrice',
                error: error.message
            });
        }
        return 2000000000;
    }
}
