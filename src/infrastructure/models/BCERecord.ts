import { BCERecordDetail } from "./BCERecordDetail";

export class BCERecord {
    constructor(
        public cutOffDate: string = '',
        public numberReferenceACH: number = 0,
        public recordsAmount: number = 0,
        public acumRecordsValues: number = 0,
        public codeACH: number = 0,
        public accountNumber: string = '',
        public remarks: string = '',
        public details: BCERecordDetail[] = []
    ) {
    }
}
