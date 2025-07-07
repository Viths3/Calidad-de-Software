import https from "https";
import { TransactionInstitution } from "../infrastructure/models/TransactionInstitution";
import { TransactionSwitch } from "../infrastructure/models/TransactionSwitch";
import { MongoDBInstitutionRepository } from "../infrastructure/repositories/MongoDBInstitutionRepository";
import { MongoDBTransactionInstitutionRepository } from "../infrastructure/repositories/MongoDBTransactionInstitutionRepository";
import { parseAsUTC, parseStringDateToUTC, registerLogErrorAuto } from "../utils/common";
import fetchAPI from "../utils/fetchAPI";
import { keyDecrypt, keyEncrypt } from "../utils/security";

/**
 * Servicio encargado de manejar las operaciones relacionadas a las transacciones
 * de las instituciones financieras, incluyendo consumo externo, validación,
 * encriptación y almacenamiento en base de datos MongoDB.
 */

export class TransactionInstitutionService {
    private transactionInstitutionRepository: MongoDBTransactionInstitutionRepository;
    private institutionRepository: MongoDBInstitutionRepository;
    //variable interna que contiene el nombre del servicio genérico para todas las instituciones

    constructor(
        transactionInstitutionRepository: MongoDBTransactionInstitutionRepository,
        institutionRepository: MongoDBInstitutionRepository
    ) {
        this.transactionInstitutionRepository = transactionInstitutionRepository;
        this.institutionRepository = institutionRepository;
    }

    /*************************************************************************/
    /**
     * Guarda las transacciones de una institución, encriptando los campos sensibles.
     * @param institutionCode Código de la institución
     * @param transactions Lista de transacciones del switch
     * @param initialDate Fecha de inicio del rango
     * @param finishDate Fecha final del rango
     * @returns Resultado de la operación con status, mensaje y error si existe
     */
    async saveTransactionsInstitution(institutionCode: number, transactions: TransactionSwitch[], initialDate: string, finishDate: string): Promise<any> {
        //validamos codigo de institución
        try {
            const result = await this.institutionRepository.findByCode(institutionCode);
            if (result.status === -1) {
                return {
                    status: -1,
                    message: "no se encontró la institución",
                    error: "Error al buscar institución por código"
                }
            }
            //encriptamos la información sencible antes de grabar
            const encryptedTransactions = this.encryptTransactionFields(transactions);
            //grabamos los datos
            await this.transactionInstitutionRepository.saveTransactions(institutionCode, encryptedTransactions, initialDate, finishDate);
            return {
                status: 1,
                message: "Transacciones guardadas",
                error: ""
            }
        } catch (error) {
            await registerLogErrorAuto('error', error, 'Error al guardar transacciones de la institución ${institucionCode}');
            return {
                status: -1,
                message: "Error al guardar transacciones de la institución",
                error: error
            }

        }
    }

    /*************************************************************************/
    /**
     * Obtiene las transacciones externas de una institución financiera llamando a su servicio específico.
     *
     * Este método busca el dominio configurado de la institución y realiza una petición HTTP POST
     * al servicio remoto para obtener las transacciones dentro del rango de fechas indicado,
     * filtradas por una lista de servicios específicos.
     *
     * ### Códigos de estado devueltos:
     * - status: 1  - Transacciones obtenidas exitosamente.
     * - status: 0  - La institución no tiene dominio configurado para consumo externo.
     * - status: -1 - Error en el consumo del servicio o en la estructura de la respuesta.
     *
     * @param institutionCode - Código numérico que identifica a la institución.
     * @param startDate - Fecha de inicio del rango de búsqueda (formato `YYYY-MM-DD HH:mm:ss`).
     * @param endDate - Fecha de fin del rango de búsqueda (formato `YYYY-MM-DD HH:mm:ss`).
     * @param serviceList - Lista de identificadores de servicios a consultar (por ejemplo: `["QR", "CORE"]`).
     * @returns Un objeto que contiene:
     *   - status: número de estado (1, 0 o -1),
     *   - error: mensaje de error si aplica,
     *   - message: descripción del resultado,
     *   - transactions: arreglo de objetos `TransactionInstitution` obtenidos del servicio externo.
     */
    async fetchInstitutionTransactions(
        institutionCode: number,
        startDate: string,
        endDate: string,
        serviceList: string[]
    ): Promise<any> {
        //declaramos la lista donde se devolvera la respuesta
        let transactions: TransactionInstitution[] = [];
        //verificamos si la institución tiene configurado el servicio para obtener las transacciones directamente
        // status 1  tiene configurado un servicio
        // status 0  no tiene configurado un servicio
        const domainInstitution = await this.institutionRepository.findDomainByCode(institutionCode);
        if (domainInstitution === "") {
            return {
                status: 0,
                error: "Institutución no cuenta con servicio de obtención de transacciones.",
                message: "Institutución no cuenta con servicio de obtención de transacciones.",
                transactions: transactions

            };
        }
        if (domainInstitution === "error") {
            return {
                status: -1,
                error: "Error al obtener el dominio de la institución para consumo de servicio.",
                message: "Error al obtener el dominio de la institución para consumo de servicio.",
                transactions: transactions

            };
        }
        //en caso de tener configurado un servicio generamos los parametros correspondientes
        const extApiUrl = process.env.EXTERNAL_API_URL || "http://172.20.91.8:3000/api/transaction/data"
        const externalTransactionUrl = process.env.EXTERNAL_TRANSACTION_URL || "/api/v1/transactions/transactionReconciliationList";
        const url = domainInstitution + externalTransactionUrl;
        //console.log(extApiUrl, "      ", externalTransactionUrl,"   ",    url,"   ", startDate," ",endDate , serviceList )

        //realizamos el consumo del servicio web
        try {
            const response = await fetchAPI(extApiUrl, 'POST', {
                url,
                data: {
                    startDate,
                    endDate,
                    serviceList
                }
            }, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const responseData = response.data;
            //validamos que tengamos una respuesta valida del servicio
            if (response.status !== 1 || !Array.isArray(responseData)) {
                return {
                    status: -1,
                    error: response.message,
                    message: 'Error al obtener transacciones externas',
                    transactions: transactions

                };

            }
            //devolvemos las transacciones recuperadas
            transactions = responseData.map((item: any) => {
                return new TransactionInstitution(
                    item.uuid,
                    item.cutOffNumber,
                    item.cutOffDate,
                    parseStringDateToUTC(item.transactionDate),     //new Date(item.transactionDate),
                    String(item.accountTypeId),
                    item.accountNumber,
                    parseFloat(item.transactionValue.toFixed(2)),
                    item.movementCode,
                    item.transactionType,
                    item.institutionCode,
                    item.serviceCode,
                    item.transactionStatus,
                    item.reverseMovementCode || ''
                );
            });

            return {
                status: 1,
                error: "",
                message: 'Transacciones obtenidas exitosamente',
                transactions: transactions

            }

        } catch (error: any) {
            //console.log  (error);
            await registerLogErrorAuto('error', error, `Error al consumir servicio externo ${domainInstitution}`);
            return {
                status: -1,
                error: error.message,
                message: 'No se pudieron obtener las transacciones externas',
                transactions: []

            };

        }
    }

    /*************************************************************************/
    /**
     * Realiza el proceso completo de obtención y guardado de transacciones externas desde las instituciones.
     * @param institutionCode Código de la institución
     * @param startDate Fecha de inicio del rango
     * @param endDate Fecha final del rango
     * @param serviceList Lista de servicios a consultar
     * @returns Resultado del proceso incluyendo errores si ocurrieron
     */
    async getSaveExternalTransactions(
        institutionCode: number,
        startDate: string,
        endDate: string,
        serviceList: string[]
    ): Promise<any> {
        try {
            //obtenemos las transacciones a partir de un servicio aqui la respuesta de status es 0 no posee servicio,  1 tiene servicio y se obtuvieron datos
            const transactions = await this.fetchInstitutionTransactions(
                institutionCode,
                startDate,
                endDate,
                serviceList
            );

            // si el procedimiento para consumir las transacciones da un error
            if (transactions.status === -1) {
                return {
                    status: -1,
                    message: transactions.message,
                    error: transactions.error
                };

            }
            //si la intitución no tendia configurado el consumo de servicio
            if (transactions.status === 0) {
                return {
                    status: 0,
                    message: transactions.message || "Institución no tiene configurado servicio para obtener transacciones",
                    error: transactions.error || "no se obtuvo ninguna transacción, institución no tiene disponible servicio"
                };

            }
            //encriptamos los campos sencibles
            //            const transactionsWithEncryptFields = await this.encryptTransactionFields(transactions.transactions);
            // Guardar las transacciones obtenidas con la data encriptada
            await this.saveTransactionsInstitution(
                institutionCode,
                transactions.transactions,
                startDate,
                endDate
            );

            return {
                status: 1,
                message: "Transacciones externas obtenidas y guardadas exitosamente",
                transactionCount: transactions.length
            };

        } catch (error) {
            await registerLogErrorAuto('error', error, 'Error al obtener y guardar las transacciones externas de la institucion ${institutionCode}');
            console.error('Error al guardar la conciliación:', error);
            return {
                status: -1,
                message: "Se produjo un error general al guardar la obtener y guardar las transacciones externas",
                error: error,
            };
        }

    }



    /*************************************************************************/
    /**
     * Encripta campos sensibles en las transacciones
     * @param transactions Lista de transacciones
     * @returns Lista con campos encriptados
     */
    private encryptTransactionFields(transactions: TransactionInstitution[]): TransactionInstitution[] {
        return transactions.map(tx => ({
            ...tx,
            accountNumber: tx.accountNumber ? keyEncrypt(tx.accountNumber.toString()) : '',
            accountTypeId: tx.accountTypeId ? keyEncrypt(tx.accountTypeId.toString()) : '',
        }));
    }

    /*************************************************************************/
    /**
     * Desencripta campos sensibles en las transacciones
     * @param transactions Lista de transacciones
     * @returns Lista con campos encriptados
     */
    private desEncryptTransactionFields(transactions: TransactionInstitution[]): TransactionInstitution[] {
        return transactions.map(tx => ({
            ...tx,
            accountNumber: tx.accountNumber ? keyDecrypt(tx.accountNumber) : '',
            accountTypeId: tx.accountTypeId ? keyDecrypt(tx.accountTypeId) : '',
        }));
    }


    /*************************************************************************/
    /**
     * Valida si las transacciones están dentro del rango de fechas indicado
     * y transforma cada una en una instancia de TransactionInstitution.
     *
     * @param transactions Lista de transacciones (formato crudo del request)
     * @param initialDate Fecha inicio del rango
     * @param finishDate Fecha fin del rango
     * @returns Un objeto con status y error si hay transacciones fuera de rango, o la lista validada si todo está bien
     */
    public validateTransactionDateRange(
        transactionList: any[],
        initialDateStr: string,
        finishDateStr: string
    ): any {

        let transactions: TransactionInstitution[] = [];
        const initialDate = parseAsUTC(initialDateStr);
        const finishDate = parseAsUTC(finishDateStr);
        //console.log("➡️ initialDateStr:", initialDateStr, "| UTC:", initialDate.toISOString());
        //console.log("➡️ finishDateStr :", finishDateStr,  "| UTC:", finishDate.toISOString());

        for (const tx of transactionList) {

            //const txDate = new Date(tx.transactionDate);
            const originalTxDateStr = tx.transactionDate;
            const txDate = parseStringDateToUTC(tx.transactionDate);
            //console.log("\nTransacción:");
            //console.log(" tx.transactionDate (original):", originalTxDateStr);
            //console.log(" txDate UTC convertido:", txDate.toISOString());

            // Validar transactionDate (como fecha completa)
            if (txDate < initialDate || txDate > finishDate) {
                transactions = [];
                return {
                    status: -1,
                    error: "hay transacciones que no están en el rango de fechas establecido (transactionDate)",
                    message: "No se puede cargar las transacciones",
                    transactions: []
                };
            }


            transactions.push(new TransactionInstitution(
                tx.uuid,
                tx.cutOffNumber,
                tx.cutOffDate,
                txDate,
                String(tx.accountTypeId),
                tx.accountNumber,
                parseFloat(tx.transactionValue.toFixed(2)),
                tx.movementCode,
                tx.transactionType,
                tx.institutionCode,
                tx.serviceCode,
                tx.transactionStatus,
                tx.reverseMovementCode || ''
            ));
        }

        return {
            status: 1,
            error: "",
            message: "Transacciones OK",
            transactions
        };

    }

}
