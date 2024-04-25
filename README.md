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

- Start the server using 
```bash
npm run start
```

- Start the server using nodemon
```bash
npm run start:dev
```
