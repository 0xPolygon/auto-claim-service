# Auto Claim Service

## Introduction

The Auto Claim script is the script which runs on cron job to claim the transactions on particular destination
chain in LXLY bridge.

## Prerequisite

- Create `.env` file in all the packages with corresponding fields as present in `.env.example` files in corresponding directories.

- Download all module dependencies by running
```bash
npm install
```

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
