export class Transaction {
    static map: any;
    constructor(
      public _id: object,
      public uuid: string,
      public cutOffNumber: string,
      public cutOffDate: string,
      public transactionDate: Date,
      public accountTypeId: string,
      public accountNumber: string,
      public transactionValue: number,
      public movementCode: string,
      public transactionType: string,
      public institutionCode: number,
      public serviceCod: string,
      public transactionStatus: number,
      public reverseMovementCode: string
    ) {
      //this.transactionValue = parseFloat(transactionValue.toFixed(2));
    }
  }