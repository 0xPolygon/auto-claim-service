export interface INotifyParams {
    claimType: string
    bridgeTxHash: string
    sourceNetwork: number
    destinationNetwork: number
    error: string
    depositIndex: number
}

export interface IProof {
    merkle_proof: Array<string>,
    rollup_merkle_proof: Array<string>,
    main_exit_root: string,
    rollup_exit_root: string
}