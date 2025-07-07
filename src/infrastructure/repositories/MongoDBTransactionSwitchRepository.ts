import { Db } from "mongodb";
import { Model } from 'mongoose';
import { TransactionSwitch } from "../models/TransactionSwitch";
import { getDateRange,parseAsUTC,parseStringDateToUTC,parseToUTCDate, registerLogErrorAuto, toLocalDateObject } from "../../utils/common";
import { PostgreSqlTransactionRepository } from "./PostgreSqlTransactionRepository";

export class MongoDBTransactionSwitchRepository {
  private db: Db;
  private collectionName = "transaction_switch";

  constructor(private postgreSqlTransactionRepository: PostgreSqlTransactionRepository,db: Db) {
    this.db = db;
  }


  async saveTransactions(transactions: TransactionSwitch[], fechaInicio: string, fechaFin: string): Promise<void> {
    if (transactions.length === 0) return;
    const { start, end } = getDateRange(fechaInicio, fechaFin);

    await this.db.collection(this.collectionName).deleteMany({
      transactionDate: {
        $gte: start,
        $lte: end
      }
    });
    console.log(`🗑️ Se eliminaron transacciones existentes entre ${fechaInicio} y ${fechaFin}`);

    await this.db.collection(this.collectionName).insertMany(transactions);
    console.log(`✅ ${transactions.length} transacciones del switch guardadas en MongoDB`);
  }

  //----------------------------------------------------

  async listTransaction(
    instCode: number,
    startDate: string,
    finishDate: string,
    limit: number,
    page: number
  ): Promise<{
    transaction: TransactionSwitch[],
    total: number,
    totalPages: number,
    currentPage: Number,
    currentCount: number
  }> {

    // Validar que la página sea mayor que 0
    const pageValid = page > 0 ? page : 1; // Si page es 0 o menor, ponerlo en 1

    //consulta para sacar el total de transacciones
    const query = {
      institutionCode: instCode,
      transactionDate: {
        $gte: parseToUTCDate(startDate),
        $lte: parseToUTCDate(finishDate)
      }
    };

    //obtenermos el numero total de transacciones
    const total = await this.db.collection(this.collectionName).countDocuments(query);

    // Calcular el salto según la página solicitada (1-indexed)
    const skip = (pageValid - 1) * limit;

    const transactionSwitch = await this.db.collection(this.collectionName)
      .find(query)   // misma consulta del conteo
      .sort({ transactionDate: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Calcular el número total de páginas
    const totalPages = Math.ceil(total / limit);

    // Asegurarse de que la página actual no sea mayor que el total de páginas
    const currentPage = pageValid > totalPages ? totalPages : pageValid;

    const transactions = transactionSwitch.map((row: any) => new TransactionSwitch(
      row.uuid,
      row.cutOffNumber,
      row.cutOffDate,
      new Date(row.transactionDate),
      row.accountTypeId,
      row.accountNumber,
      row.transactionValue,
      row.movementCode,
      row.transactionType,
      row.institutionCode,
      row.serviceCod,
      row.transactionStatus,
      row.reverseMovementCode,
      row.institutionCodeReceiver,
    ));

    return {
      transaction: transactions,
      total,
      totalPages,
      currentPage,
      currentCount: transactionSwitch.length
    }
  }

  //----------------------------------------------------

  async getFilteredTransactionTotals(year: number, institutionCode: number) {
    try {
      // Obtener las fechas del inicio y fin del año dado
      const startOfYear = new Date(year, 0, 1);  // 1 de enero del año
      const endOfYear = new Date(year + 1, 0, 0); // 31 de diciembre del año

      // Obtener las transacciones del año actual
      const transactions = await this.db.collection(this.collectionName).find({
        transactionDate: { $gte: startOfYear, $lte: endOfYear },
        institutionCode: institutionCode
      }).toArray();

      // Calcular los totales y cantidades de débitos y créditos para el año actual
      const debitCount = transactions.filter(tx => tx.transactionType === "D").length;
      const creditCount = transactions.filter(tx => tx.transactionType === "C").length;
      const transactionCount = debitCount + creditCount;

      const debitTotal = transactions
        .filter(tx => tx.transactionType === "D")
        .reduce((sum, tx) => sum + parseFloat(tx.transactionValue), 0.00);

      const creditTotal = transactions
        .filter(tx => tx.transactionType === "C")
        .reduce((sum, tx) => sum + parseFloat(tx.transactionValue), 0.00);

      const total = debitTotal + creditTotal;

      // Obtener las transacciones del año anterior
      const startOfLastYear = new Date(year - 1, 0, 1);  // 1 de enero del año anterior
      const endOfLastYear = new Date(year, 0, 0); // 31 de diciembre del año anterior

      const lastYearTransactions = await this.db.collection(this.collectionName).find({
        transactionDate: { $gte: startOfLastYear, $lte: endOfLastYear },
        institutionCode: institutionCode
      }).toArray();

      // Calcular los totales de débitos y créditos para el año anterior
      const debitTotalLastYear = lastYearTransactions
        .filter(tx => tx.transactionType === "D")
        .reduce((sum, tx) => sum + parseFloat(tx.transactionValue), 0.00);

      const creditTotalLastYear = lastYearTransactions
        .filter(tx => tx.transactionType === "C")
        .reduce((sum, tx) => sum + parseFloat(tx.transactionValue), 0.00);

      // Calcular los porcentajes de variación respecto al año anterior
      const debitPercentage = debitTotalLastYear === 0 ? 0 : ((debitTotal - debitTotalLastYear) / debitTotalLastYear) * 100;
      const creditPercentage = creditTotalLastYear === 0 ? 0 : ((creditTotal - creditTotalLastYear) / creditTotalLastYear) * 100;

      const roundToTwoDecimals = (num: number): number => {
        return Math.round(num * 100) / 100;
      };

      return {
        debitCount,
        creditCount,
        transactionCount,
        debitTotal: roundToTwoDecimals(debitTotal),
        creditTotal: roundToTwoDecimals(creditTotal),
        total,
        debitPercentage: roundToTwoDecimals(debitPercentage),  // Redondeo a 2 decimales como número
        creditPercentage: roundToTwoDecimals(creditPercentage)
      };
    } catch (error) {
      //registro de error en el log
      await registerLogErrorAuto('error', error, `Se produjo error al obtener los totales de transacciones  para la institución: ${institutionCode} año: ${year} `);
      throw new Error(`Error obteniendo los totales de transacciones: ${String(error)}`);
    }
  }

    async getTransactionSummaryByInstitution(startDate: string, endDate: string): Promise<Record<string, Record<string, any>>> {
        const transactions = await this.postgreSqlTransactionRepository.getTransactionsByDate(startDate, endDate);

        const result: Record<string, Record<string, any>> = {};
        const round = (n: number) => Math.round(n * 100) / 100;

        const grouped = transactions.reduce((acc: Record<string, Record<string, any[]>>, tx) => {
            const codeSender = tx.institutionCode?.toString() || "SIN_CODIGO";
            const codeReceiver = tx.institutionCodeReceiver?.toString() || "SIN_CODIGO";
            if (!acc[codeSender]){
                acc[codeSender] = {};
            }
            if (!acc[codeSender][codeReceiver]){
                acc[codeSender][codeReceiver] = [];
            }
            acc[codeSender][codeReceiver].push(tx);
            return acc;
        }, {});

        for (const codeSender in grouped) {
            result[codeSender] = {};
            for (const codeReceiver in grouped[codeSender]){
                let transactionCount = 0;
                let total = 0;
                const group = grouped[codeSender][codeReceiver];
                const debits = group.filter(tx => tx.transactionType === "D");
                if(debits.length === 0){
                    //console.log("Sin debitos");
                    continue;
                }
                const debitCount = debits.length;
                transactionCount += debitCount;

                const debitTotal = debits.reduce((sum, tx) => sum + tx.transactionValue, 0);
                const institutionCode = group.at(1).institutionCode;
                const institutionReceiver = group.at(1).institutionCodeReceiver;
                total += debitTotal;


                result[codeSender][codeReceiver] = {
                    institutionCode,
                    institutionReceiver,
                    transactionCount,
                    total: round(total)
                };
            }
            if(Object.keys(result[codeSender]).length === 0){
                delete result[codeSender];
            }
        }

        return result;
    }

  async getMonthlyTransactionCount(year: number, institutionCode: string): Promise<number[]> {
    //const db = await connectDB();
    const collection = this.db.collection("transaction_switch");

    const startDate = parseAsUTC(`${year}-01-01T00:00:00.000`);
    const endDate = parseAsUTC(`${year + 1}-01-01T00:00:00.000`);

    const pipeline = [
      {
        $match: {
          institutionCode,
          transactionDate: {
            $gte: startDate ,  //new Date(`${year}-01-01T00:00:00Z`),
            $lt: endDate       //new Date(`${year + 1}-01-01T00:00:00Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$transactionDate" },
          count: { $sum: 1 }
        }
      }
    ];

    const results = await collection.aggregate(pipeline).toArray();

    const monthlyData = Array(12).fill(0);

    results.forEach(r => {
      const monthIndex = r._id - 1; // enero = 1
      monthlyData[monthIndex] = r.count;
    });

    return monthlyData;
  }


  async getMonthlyTransactionValue(year: number, institutionCode: string): Promise<any> {
    //const db = await connectDB();
    const collection = this.db.collection("transaction_switch");
    const startDate = parseAsUTC(`${year}-01-01T00:00:00.000`);
    const endDate = parseAsUTC(`${year + 1}-01-01T00:00:00.000`);

    //consulta que me filtra por codigo de institución fechas y agrupa por tipo de transacción la suma de los valores
    const pipeline = [
      {
        $match: {
          institutionCode,
          transactionDate: {
            $gte: startDate,    //new Date(`${year}-01-01T00:00:00Z`),
            $lt:  endDate       //new Date(`${year + 1}-01-01T00:00:00Z`)
          }
        }
      },
      // {
      //   $addFields: {
      //     transactionValue1: { $toDouble: "$transactionValue" }
      //   }
      // },
      {
        $group: {
          _id: {
            month: { $month: "$transactionDate" },
            type: "$transactionType"
          },
          totalValue: { $sum: "$transactionValue" }
        }
      }
    ];

    const results = await collection.aggregate(pipeline).toArray();

    //arrays con 12 meses para débito y crédito
    const debit = Array(12).fill(0.00);
    const credit = Array(12).fill(0.00);

    results.forEach(r => {
      const monthIndex = r._id.month - 1;
      const value = parseFloat(r.totalValue.toFixed(2)); // Asegura formato decimal correcto

      if (r._id.type === "D") {
        debit[monthIndex] = value;
      } else if (r._id.type === "C") {
        credit[monthIndex] = value;
      }
    });

    return { debit, credit };
  }

}


