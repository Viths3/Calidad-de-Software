export class TransactionSwitch {
  static map: any;
  constructor(
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
    public reverseMovementCode: string,
    public institutionCodeReceiver: number
  ) {
    //this.transactionValue = parseFloat(transactionValue.toFixed(2));
  }
}
