import { Db } from "mongodb";
import { parseAsUTC, parseToUTCDate } from "../../utils/common";
import { TransactionInstitution } from "../models/TransactionInstitution";

/**
 * Repositorio para manejar operaciones de persistencia sobre la colección `transaction_institution` en MongoDB.
 */
export class MongoDBTransactionInstitutionRepository {
  private db: Db;
  private collectionName = "transaction_institution";

  //***************************************************************
  /**
   * Constructor del repositorio.
   * @param db Instancia de la base de datos MongoDB.
   */
  constructor(db: Db) {
    this.db = db;
  }

  //***************************************************************
  /**
   * Guarda un conjunto de transacciones para una institución, eliminando previamente
   * las transacciones existentes en el rango de fechas especificado.
   *
   * @param institutionCode Código de la institución.
   * @param transactions Arreglo de transacciones a insertar.
   * @param fechaInicio Fecha de inicio del rango (formato ISO o yyyy-mm-dd).
   * @param fechaFin Fecha de fin del rango (formato ISO o yyyy-mm-dd).
   */
  async saveTransactions(institutionCode: number, transactions: TransactionInstitution[], fechaInicio: any, fechaFin: any): Promise<void> {

    if (transactions.length === 0)
      return;

    let start: Date;
    let end: Date;

    //VALIDAMOS SI LAS FECHAS YA LLEGAN CON FORMATO FECHA Y HORA
    start = parseAsUTC(fechaInicio);
    end = parseAsUTC(fechaFin)

    // Eliminar transacciones existentes de la misma institución y dentro del mismo rango de fechas
    await this.db.collection(this.collectionName).deleteMany({
      institutionCode: institutionCode, // borramos solo los códigos existentes de esta institución
      transactionDate: {
        $gte: start, // Mayor o igual a fechaInicio
        $lte: end // Menor o igual a fechaFin
      }
    });
    console.log(`🗑️ Se eliminaron transacciones de la institución existentes entre ${fechaInicio} y ${fechaFin}`);
    // Insertar nuevas transacciones
    await this.db.collection(this.collectionName).insertMany(transactions);
    console.log(`✅ ${transactions.length} transacciones del switch guardadas en MongoDB`);
  }


  //***************************************************************
  /**
   * Lista las transacciones de una institución con paginación y filtros por fecha.
   *
   * @param instCode Código de la institución.
   * @param startDate Fecha de inicio del rango (ISO o yyyy-mm-dd).
   * @param finishDate Fecha de fin del rango (ISO o yyyy-mm-dd).
   * @param limit Número de resultados por página.
   * @param page Página solicitada (base 1).
   *
   * @returns Objeto con el listado de transacciones y metainformación de la paginación.
   **/
  async listTransactionsInstitution(
    instCode: number,
    startDate: string,
    finishDate: string,
    limit: number,
    page: number
  ): Promise<{
    transaction: TransactionInstitution[],
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

    return {
      transaction: transactionSwitch.map((row: any) => new TransactionInstitution(
        row.uuid,
        row.cutOffNumber,
        row.cutOffDate,
        row.transactionDate,
        row.accountTypeId,
        row.accountNumber,
        row.transactionValue,
        row.movementCode,
        row.transactionType,
        row.institutionCode,
        row.serviceCod,
        row.transactionStatus,
        row.reverseMovementCode,
        //row._id.toString()
      )),
      total,
      totalPages,
      currentPage,
      currentCount: transactionSwitch.length
    }
  }



}


