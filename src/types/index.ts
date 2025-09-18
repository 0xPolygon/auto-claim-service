export interface INotifyParams {
    claimType: string
    bridgeTxHash: string
    sourceNetwork: number
    destinationNetwork: number
    error: string
    depositIndex: number
}

export interface IProof {
    proof_local_exit_root: Array<string>,
    proof_rollup_exit_root: Array<string>,
    l1_info_tree_leaf: {
        block_num: number,
        block_pos: number,
        l1_info_tree_index: number,
        previous_block_hash: string,
        timestamp: number,
        mainnet_exit_root: string,
        rollup_exit_root: string,
        global_exit_root: string,
        hash: string
    }
}

export interface ITransaction {
    globalIndex: number,
    claimTimestamp: number,
    claimBlockNumber: number,
    sourceNetwork: number,
    depositCount: number,
    claimTransactionHash: string,
    amount: string,
    bridgeHash: string,
    leafType: string,
    transactionIndex: number,
    hubUID: string,
    transactionHash: string,
    destinationNetwork: number,
    receiverAddress: string,
    blockNumber: number,
    fromAddress: string,
    originTokenAddress: string,
    originTokenNetwork: number,
    timestamp: number,
    leafIndex: number,
    lastUpdatedAt: number,
    status: string,
}