export default [
    {
        "inputs": [
            {
                "internalType": "bytes32[32]",
                "name": "smtProofLocalExitRoot",
                "type": "bytes32[32]"
            },
            {
                "internalType": "bytes32[32]",
                "name": "smtProofRollupExitRoot",
                "type": "bytes32[32]"
            },
            {
                "internalType": "uint256",
                "name": "globalIndex",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "mainnetExitRoot",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "rollupExitRoot",
                "type": "bytes32"
            },
            {
                "internalType": "uint32",
                "name": "originNetwork",
                "type": "uint32"
            },
            {
                "internalType": "address",
                "name": "originTokenAddress",
                "type": "address"
            },
            {
                "internalType": "uint32",
                "name": "destinationNetwork",
                "type": "uint32"
            },
            {
                "internalType": "address",
                "name": "destinationAddress",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "metadata",
                "type": "bytes"
            }
        ],
        "name": "claimAsset",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32[32]",
                "name": "smtProofLocalExitRoot",
                "type": "bytes32[32]"
            },
            {
                "internalType": "bytes32[32]",
                "name": "smtProofRollupExitRoot",
                "type": "bytes32[32]"
            },
            {
                "internalType": "uint256",
                "name": "globalIndex",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "mainnetExitRoot",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "rollupExitRoot",
                "type": "bytes32"
            },
            {
                "internalType": "uint32",
                "name": "originNetwork",
                "type": "uint32"
            },
            {
                "internalType": "address",
                "name": "originAddress",
                "type": "address"
            },
            {
                "internalType": "uint32",
                "name": "destinationNetwork",
                "type": "uint32"
            },
            {
                "internalType": "address",
                "name": "destinationAddress",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "metadata",
                "type": "bytes"
            }
        ],
        "name": "claimMessage",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
]