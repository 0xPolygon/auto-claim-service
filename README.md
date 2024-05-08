# Auto Claim Service

## Introduction

Autoclaim Script is a cron job service which is used to process the claim transactions for the bridge transactions initiated on the lxly bridge. Bridging involves two steps. 1st Step is done on the source chain and the second on the destination chain. The script automates the second step so that users don't have to manually execute this second step. It fetches the transaction details from the transaction list endpoint of the Bridge API service, gets the merkle proof payload for each bridge transaction and then submits the claim transaction on the destination chain. 

## Prerequisite

- Create `.env` file in all the packages with corresponding fields as present in `.env.example` files in corresponding directories.

- Download all module dependencies by running
```bash
npm install
```

- You can host the gas price estimation service for your chain by following the instructions on this repo: https://github.com/maticnetwork/maticgasstation


## Running

- Build using 
```bash
npm run build
```

- Start the server using 
```bash
npm run start
```

## License

Copyright (c) 2024 PT Services DMCC

Licensed under either:

- Apache License, Version 2.0, ([LICENSE-APACHE](./LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0), or
- MIT license ([LICENSE-MIT](./LICENSE-MIT) or http://opensource.org/licenses/MIT)

as your option.

The SPDX license identifier for this project is `MIT` OR `Apache-2.0`.

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
