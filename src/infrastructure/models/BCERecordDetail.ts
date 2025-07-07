export class BCERecordDetail{
    constructor(
        public institutionCodeSender: string = '',
        public institutionCodeReceiver: string = '',
        public transactionAmount: number = 0,
        public transactionsTotal: number = 0
    ) {
    }
}
