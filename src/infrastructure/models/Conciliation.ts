import { formatDateYYYYMMDD } from "../../utils/common";
import { ConciliationDetail } from "./ConciliationDetail";
import { ObjectId } from "mongodb";
import { getLocalTimeAsUTC } from "../../utils/common";

export class Conciliation {
    constructor(
        public institutionCode:number,
        public cutOffDate: string,
        //public cutOffNumber: string = "",   // se quita de momento este campo 
        public conciliationDate: Date,
        public transactionCount: number = 0,
        public transactionError: number = 0,
        public transactionOk: number = 0,
        public pending: number = 0,
        public reconciled: number = 0,
        public debitTotalConciled: number = 0,
        public creditTotalConciled: number = 0,
        public netAmountConciled: number = 0,
        public debitTotal: number = 0,
        public creditTotal: number = 0,
        public netAmount: number = 0,        
        public creationDate: Date = getLocalTimeAsUTC(),
        public creationUser: string = "",
        public editDate: Date = getLocalTimeAsUTC(),
        public editUser: string = "",
        public statusConciliation: number =0,    // 0 no existe conciliacion,  1 en proceso conciliacion con pendientes,  2  ok conciliacion con cero pendientes
        public details: ConciliationDetail[] = [],                    
        public _id?: ObjectId // <-- Aquí añadimos el campo opcional
    ) {
        this.conciliationDate = conciliationDate ?? getLocalTimeAsUTC();     

    }
 
  }
  