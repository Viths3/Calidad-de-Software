import { TransactionSwitch } from "../infrastructure/models/TransactionSwitch";
import { MongoDBTransactionSwitchRepository } from "../infrastructure/repositories/MongoDBTransactionSwitchRepository";
import { keyEncrypt, keyDecrypt } from "../utils/security";

/**
 * Interfaz que define el contrato para repositorios que obtienen transacciones externas.
 */
export interface TransactionRepository {
    getTransactionsByDate(fechaInicio: string, fechaFin: string): Promise<TransactionSwitch[]>;
}
/**
 * Interfaz que define el contrato para servicios que almacenan transacciones.
 */
export interface TransactionStorage {
    saveTransactions(transactions: TransactionSwitch[], fechaInicio: string, fechaFin: string): Promise<void>;
}

/*************************************************************************/
/**
 * Servicio principal para gestionar transacciones del switch, incluyendo búsqueda,
 * almacenamiento, encriptación y obtención de estadísticas.
 */
export class TransactionsService {
    constructor(
        private mongoDBTransactionRepository: MongoDBTransactionSwitchRepository,
        private transactionRepository: TransactionRepository,
        private transactionStorage: TransactionStorage
    ) { }

    /*************************************************************************/
    /**
     * Obtiene transacciones externas en un rango de fechas y las almacena.
     * @param fechaInicio Fecha de inicio del rango
     * @param fechaFin Fecha final del rango
     * @returns Lista de transacciones obtenidas
     */
    async findAndStoreTransactions(fechaInicio: string, fechaFin: string): Promise<TransactionSwitch[]> {
        //recuperamos las transacciones de la institucion
        const transactions = await this.transactionRepository.getTransactionsByDate(fechaInicio, fechaFin);
        //encriptamos los datos antes de gragar
        //const encryptedTransactions = this.encryptTransactionFields(transactions);
        //enviamos a grabar
        await this.transactionStorage.saveTransactions(transactions, fechaInicio, fechaFin);
        return transactions;
    }

    /*************************************************************************/
    /**
     * Lista las transacciones de una institución en un rango de fechas, con paginación.
     * @param instCode Código de la institución
     * @param startDate Fecha inicio del rango
     * @param endDate Fecha final del rango
     * @param limit Límite de resultados
     * @param offset Desplazamiento
     * @returns Objeto con las transacciones desencriptadas y metadatos
     */
    async listTransactionByInstitution(instCode: number, startDate: string, endDate: string, limit: number, offset: number) {
        let result = await this.mongoDBTransactionRepository.listTransaction(instCode, startDate, endDate, limit, offset);
        result.transaction = this.desEncryptTransactionFields(result.transaction);
        return result;
    }

    /*************************************************************************/
    /**
     * Obtiene totales de transacciones filtradas por institución y año.
     * @param year Año a consultar
     * @param institutionCode Código de la institución
     * @returns Totales agrupados
     */
    async getTransactionTotals(year: number, institutionCode: number) {
        return await this.mongoDBTransactionRepository.getFilteredTransactionTotals(year, institutionCode);
    }


    /*************************************************************************/
    /**
     * Obtiene el conteo mensual de transacciones para una institución y año.
     * @param year Año a consultar
     * @param institutionCode Código de institución como string
     * @returns Arreglo con cantidades por mes (índice 0 = enero)
     */
    async monthlyTransactionCount(year: number, institutionCode: string): Promise<number[]> {
        return await this.mongoDBTransactionRepository.getMonthlyTransactionCount(year, institutionCode);
    }

    /*************************************************************************/
    /**
     * Obtiene un resumen de transacciones agrupado por institución para un rango de fechas.
     * @param startDate Fecha inicial del rango
     * @param endDate Fecha final del rango
     * @returns Arreglo con resumen de transacciones por institución
     */
    async getTransactionSummaryByInstitution(startDate: string, endDate: string): Promise<Record<string, Record<string, any>>> {
        return await this.mongoDBTransactionRepository.getTransactionSummaryByInstitution(startDate, endDate);
    }

    /*************************************************************************/
    /**
      * Encripta campos sensibles en las transacciones
      * @param transactions Lista de transacciones
      * @returns Lista con campos encriptados
      */
    private encryptTransactionFields(transactions: TransactionSwitch[]): TransactionSwitch[] {
        return transactions.map(tx => ({
            ...tx,
            accountNumber: tx.accountNumber ? keyEncrypt(tx.accountNumber) : '',
            accountTypeId: tx.accountTypeId ? keyEncrypt(tx.accountTypeId) : '',
        }));
    }


    /*************************************************************************/
    /**
     * Desencripta campos sensibles en las transacciones
     * @param transactions Lista de transacciones
     * @returns Lista con campos encriptados
     */
    private desEncryptTransactionFields(transactions: TransactionSwitch[]): TransactionSwitch[] {
        return transactions.map(tx => ({
            ...tx,
            accountNumber: tx.accountNumber ? keyDecrypt(tx.accountNumber) : '',
            accountTypeId: tx.accountTypeId ? keyDecrypt(tx.accountTypeId) : '',
        }));
    }



}
