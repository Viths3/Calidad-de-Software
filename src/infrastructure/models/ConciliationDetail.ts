import { getLocalTimeAsUTC } from "../../utils/common";

export class ConciliationDetail {
  constructor(
    public id: number = 0,
    public state: number = 0,    
    public observation: string = "",
    public reconciled: number = 0,
    public description: string = "",
    public uuid: string = "",
    public cutOffNumber: string = "",
    public cutOffDate: string = "",
    public transactionDateSwitch?: Date,
    public accountTypeIdSwitch: string = "",
    public accountNumberSwitch: string = "",
    public transactionValueSwitch: number = 0,
    public movementCodeSwitch: string = "",
    public transactionTypeSwitch: string = "",
    public institutionCodeSwitch: number = 0,
    public serviceCodeSwitch: string = "",
    public transactionStatusSwitch: number = 0,
    public reverseMovementCodeSwitch: string = "",
    public transactionDateInstitution?: Date,
    public accountTypeIdInstitution: string = "",
    public accountNumberInstitution: string = "",
    public transactionValueInstitution: number = 0,
    public movementCodeInstitution: string = "",
    public transactionTypeInstitution: string = "",
    public institutionCodeInstitution: number = 0,
    public serviceCodInstitution: string = "",
    public transactionStatusInstitution: number = 0,
    public reverseMovementCodeInstitution: string = "",
    public editDate?:Date
  ) {

    this.editDate = editDate ?? getLocalTimeAsUTC();     
  }
}
