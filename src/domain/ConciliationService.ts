import { Conciliation } from "../infrastructure/models/Conciliation";
import { MongoDBConciliationRepository } from "../infrastructure/repositories/MongoDBConciliationRepository";
import { ConciliationDetail } from "../infrastructure/models/ConciliationDetail";
import { Transaction } from "../infrastructure/models/Transaction";
import { MongoDBInstitutionRepository } from "../infrastructure/repositories/MongoDBInstitutionRepository";
import { keyEncrypt, keyDecrypt } from "../utils/security";
import { formatDateYYYYMMDD, getDateRange, getDateTruncate, getLocalTimeAsUTC as getLocalTime, getLocalTimeAsUTC, registerLogErrorAuto } from '../utils/common';

export class ConciliationService {
    private conciliationRepository: MongoDBConciliationRepository;
    private institutionRepository: MongoDBInstitutionRepository;

    constructor(
        conciliationRepository: MongoDBConciliationRepository,
        institutionRepository: MongoDBInstitutionRepository
    ) {
        this.conciliationRepository = conciliationRepository;
        this.institutionRepository = institutionRepository;
    }

    async saveConciliacion(conciliation: Conciliation): Promise<any> {

        try {
            const existingConciliationId = await this.conciliationRepository.findConciliationIdByCutOff(
                conciliation.institutionCode,
                conciliation.cutOffDate,
                //conciliation.cutOffNumber
            );
            if (existingConciliationId) {
                conciliation._id = existingConciliationId;
            }

            //encriptamos los datos 
            conciliation.details = this.encryptDetailFields(conciliation.details);

            const resultSave = await this.conciliationRepository.save(conciliation);
            if (resultSave.error !== "") {
                throw new Error(resultSave.error);
            }

            return {
                status: 1,
                id: resultSave.id,
                error: "",
                message: "Datos de conciliación y detalle guardados correctamente",
            };
        } catch (error) {
            console.error("Error en la transacción de conciliación:", error);
            await registerLogErrorAuto('error', error, 'Guardando conciliación de la fecha ${conciliation.cutOffDate}');
            return {
                status: -1,
                id: "",
                error: `Error en la transacción de conciliación: ${error}`,
                message: "Se produjo un error y se revirtió la transacción",

            };
        }
    }



    private compareTransactions(txA: Transaction, txB: Transaction): { status: number, observation: string } {
        let observation = "";
        let status = 1;

        const diffs: [any, any, string][] = [
            [txA.accountNumber, txB.accountNumber, "Cuenta"],
            [txA.accountTypeId, txB.accountTypeId, "Tipo de cuenta"],
            [txA.transactionValue, txB.transactionValue, "Valor"],
            [txA.transactionType, txB.transactionType, "Tipo de transacción"],
            [txA.movementCode, txB.movementCode, "Código de movimiento"],
            [txA.reverseMovementCode, txB.reverseMovementCode, "Movimiento reverso"],
            [txA.transactionStatus, txB.transactionStatus, "Estado de transacción"]
        ];

        for (const [a, b, label] of diffs) {
            if (a !== b) {
                observation += ` Diferencia en ${label}.`;
                status = 0;
            }
        }

        observation = observation || "OK";

        return { status, observation };
    }


    private buildConciliation(params: {
        id: number,
        txSwitch?: Transaction,
        txInstitution?: Transaction,
        cutOffDate: string,
        estado: number,
        observation: string
    }): ConciliationDetail {
        const now: Date = getLocalTimeAsUTC();
        const s = params.txSwitch;
        const i = params.txInstitution;
        const nowStringYYYYMMDD: string = formatDateYYYYMMDD(now);


        return new ConciliationDetail(
            params.id,
            params.estado,
            params.observation,
            params.estado === 1 ? 1 : 0,
            "",
            s?.uuid || i?.uuid || "",
            s?.cutOffNumber || i?.cutOffNumber || "",
            s?.cutOffDate || i?.cutOffDate || "",
            s?.transactionDate,
            s?.accountTypeId || "",
            s?.accountNumber || "",
            s?.transactionValue || 0,
            s?.movementCode || "",
            s?.transactionType || "",
            s?.institutionCode || 0,
            s?.serviceCod || "",
            s?.transactionStatus || 0,
            s?.reverseMovementCode || "",
            i?.transactionDate,
            i?.accountTypeId || "",
            i?.accountNumber || "",
            i?.transactionValue || 0,
            i?.movementCode || "",
            i?.transactionType || "",
            i?.institutionCode || 0,
            i?.serviceCod || "",
            i?.transactionStatus || 0,
            i?.reverseMovementCode || "",
            now
        );
    }

    async executeConciliation(
        instCode: number,
        //cutOffNumber: string, 
        cutOffDate: string): Promise<any> {
        const institutionCode = instCode;
        const conciliationDate: Date = getLocalTime();
        let transactionCount = 0;
        let transactionError = 0;
        let transactionOk = 0;
        let pending = 0;
        let reconciled = 0;
        const conciliationDetail: ConciliationDetail[] = [];

        try {
            //obtenemos las transacciones del switch e institución
            const [transactionsSwitch, transactionsInstitution] = await Promise.all([
                this.conciliationRepository.listTransactionByCollection("transaction_switch", instCode, cutOffDate),
                this.conciliationRepository.listTransactionByCollection("transaction_institution", instCode, cutOffDate)
            ]);
            //objetos tipo Map (estructura clave-valor) para búsquedas y realizar la conciliación
            const institutionMap = new Map(transactionsInstitution.map(tx => [`${tx.uuid}-${tx.movementCode}`, tx]));
            const switchMap = new Map(transactionsSwitch.map(tx => [`${tx.uuid}-${tx.movementCode}`, tx]));

            let id = 1; // inicializa un contador para los IDs
            for (const txSwitch of transactionsSwitch) {
                const key = `${txSwitch.uuid}-${txSwitch.movementCode}`;
                const txInstitution = institutionMap.get(key);
                const { status, observation } = txInstitution
                    ? this.compareTransactions(txSwitch, txInstitution)
                    : { status: 0, observation: "No existe la transacción en la institución" };

                conciliationDetail.push(this.buildConciliation({
                    id,
                    txSwitch,
                    txInstitution,
                    cutOffDate,
                    estado: status,
                    observation
                }));
                id++;
            }

            //se continua con el id del proceso anterior 
            for (const txInstitution of transactionsInstitution) {
                const key = `${txInstitution.uuid}-${txInstitution.movementCode}`;
                if (!switchMap.has(key)) {
                    conciliationDetail.push(this.buildConciliation({
                        id,
                        txInstitution,
                        cutOffDate,
                        estado: 0,
                        observation: "Sin coincidencia, no existe registro en el SWITCH"
                    }));
                }
                id++;
            }

            const pending = conciliationDetail.filter(c => c.reconciled === 0).length;
            //statusConciliation  si es 0  no existe conciliacion,  1 en proceso conciliacion con pendientes,  2  ok conciliacion con cero pendientes
            const statusConciliation = (pending === 0) ? 2 : 1;

            //   ************   TOTALES    *******************
            //calculamos los totales de valores de transacciones pero solo de las transacciones de la institución que el campo transactionStatusInstitution=1
            const executedTransactions = conciliationDetail.filter(d => d.transactionStatusInstitution === 1);
            // Calculamos el total de debitos  conciliados
            const debitTotalConciled = executedTransactions
                .filter(d => d.reconciled === 1 && d.transactionTypeInstitution === "D")
                .reduce((sum, d) => sum + (d.transactionValueInstitution || 0), 0);
            // Calculamos el total de creditos  conciliados
            const creditTotalConciled = executedTransactions
                .filter(d => d.reconciled === 1 && d.transactionTypeInstitution === "C")
                .reduce((sum, d) => sum + (d.transactionValueInstitution || 0), 0);
            // Calculamos el total de debitos de todas las trancciones 
            const debitTotal = executedTransactions
                .filter(d => d.transactionTypeInstitution === "D")
                .reduce((sum, d) => sum + (d.transactionValueInstitution || 0), 0);
            //calculamos el total de créditos de todas las transacciones     
            const creditTotal = executedTransactions
                .filter(d => d.transactionTypeInstitution === "C")
                .reduce((sum, d) => sum + (d.transactionValueInstitution || 0), 0);
            //calculamos los valores netos 

            const netAmountConciled = parseFloat((creditTotalConciled - debitTotalConciled).toFixed(2)) || 0.00;
            const netAmount = parseFloat((creditTotal - debitTotal).toFixed(2)) || 0.00;

            //generamos el objeto de tipo conciliación con la información
            const conciliation = new Conciliation(
                instCode,                  //institutionCode
                cutOffDate,                //cutOffDate
                conciliationDate,          //conciliationDate
                conciliationDetail.length, //transactionCount
                conciliationDetail.filter(c => c.state === 0).length,  //transactionError
                conciliationDetail.filter(c => c.state === 1).length,   //transactionOk
                pending, //pending
                conciliationDetail.filter(c => c.reconciled === 1).length, //reconciled
                debitTotalConciled,       //debitTotalConciled
                creditTotalConciled,       //creditTotalConciled
                netAmountConciled, //netAmountConciled
                debitTotal,       //debitTotal
                creditTotal,       //creditTotal
                netAmount,                   //netAmount
                conciliationDate,             //creationDate
                "",                     //creationUser
                conciliationDate,             //editDate
                "",                     //editUser
                statusConciliation,     //statusConciliation
                conciliationDetail,            //details
                undefined            //_id
            );
            //retornamos la respuesta 
            return {
                message: "Conciliación ejecutada",
                error: "",
                conciliation
            };
        } catch (error) {
            console.log(error);
            await registerLogErrorAuto('error', error, 'Error al ejecutar la conciliación de la fecha ${cutOffDate}');
            return {
                message: "Error ejecutando la conciliación",
                error: "Error: " + error,
            }

        }
    }


    /**
   * Lista los IDs de las conciliaciones filtradas por código de institución, fecha inicial y estado.
   * 
   * Este método obtiene la fecha actual como límite final y delega la búsqueda al repositorio correspondiente.
   * 
   * @param institutionCode - Código de la institución a filtrar.
   * @param initialDate - Fecha inicial del rango de búsqueda en formato 'YYYY-MM-DD'.
   * @param status - Estado de la conciliación (por ejemplo:-1 = todos, 0 = pendiente, 1 = conciliado).
   * @returns Promesa que resuelve en un arreglo de IDs de conciliaciones.
   * 
   * @throws Error - Si ocurre un error durante la consulta al repositorio.
   */
    async listConciliationsByStatus(
        institutionCode: number,
        initialDate: string,
        status: number
    ): Promise<number[]> {
        //validamos codigo de institución
        try {
            const result = await this.institutionRepository.findByCode(institutionCode);
            if (result.status === -1) {
                throw new Error(result.message);
            }
        }
        catch (error) {
            await registerLogErrorAuto('error', error, 'Error al validar el código de la institución ${institutionCode}');
            throw new Error("Error al obtener los datos de la institución. " + (error as Error).message);
        }

        //listamos las conciliaciones por STATUS
        try {
            //const today = new Date();
            //const finalDate = today.toISOString().split('T')[0];
            const today = getLocalTimeAsUTC();
            const finalDate = formatDateYYYYMMDD(today);

            return await this.conciliationRepository.listConciliationsByStatus(
                institutionCode,
                initialDate,
                finalDate,
                status
            );
        } catch (error) {
            //console.error("Error al listar conciliaciones por estado:", error);
            await registerLogErrorAuto('error', error, 'Error al listar conciliaciones por estado entre ${today} y ${finalDate}');
            throw new Error("No se pudieron obtener las conciliaciones. Detalles: " + (error as Error).message);
        }
    }


    /**
     * Obtiene el detalle de la conciliación por fecha de corte, con un filtro por el estado en el detalle 
     *  
     * @param institutionCode - código de la institución . 
     * @param cutOffDate - Fecha de corte de la conciliación (formato YYYY-MM-DD).
     * @param stateFilter - Filtro de estado para el detalle :
     *                      -1: devuelve todos los detalles, caso contrario filtra por lo que este en el campo statefilter
      @returns Conciliación con detalles filtrados o error en caso de fallo.
     */
    async getDetailConciliationByCutOffDate(institutionCode: number, cutOffDate: string, stateFilter: number): Promise<any> {
        try {
            //obtenemos el detalle de la conciliación
            const result = await this.conciliationRepository.getDetailByCutOffDate(institutionCode, cutOffDate, stateFilter);
            if (!result) {
                return {
                    status: 0,
                    error: "No se encontró la conciliación para la fecha proporcionada.",
                    message: "Conciliación no encontrada",
                    conciliation: null
                };
            }
            //desencriptamos los datos antes de envair 
            const conciliation = this.desEncryptDetailFields(result);
            return {
                status: 1,
                error: "",
                message: "Conciliación obtenida correctamente",
                conciliation
            };
        } catch (error) {
            await registerLogErrorAuto('error', error, 'No se pudieron obtener los detalles de conciliacion de la intitucion ${institucionCode} en la fecha de corte ${cutOffDate}');
            console.error("Error al consultar la conciliación:", error);
            return {
                status: -1,
                error: `Error al consultar la conciliación: ${error}`,
                message: "No se pudo recuperar la conciliación",
                conciliation: null
            };
        }
    }

    /**
     * Obtiene el detalle de la conciliación por fecha de corte, con un filtro por el estado en el detalle 
     *  
     * @param institutionCode - código de la institución . 
     * @param cutOffDate - Fecha de corte de la conciliación (formato YYYY-MM-DD).
     * @param detailsUpdate - array de detalles con los campos a actualizar {id,renciled,descripcion} 
     * @returns cabecera de la conciliación con los datos actualizados de:  
     *          institutionCode - codigo de la institución
     *          cutOffDate - fecha de corte a actualizar
     *          editDate - fecha y hora de actualización
     *          transactionCount - Transacciones totales, 
     *          transactionError - número de transacciones con error
     *          pending - número de transacciones pendientes de conciliar
     *          reconciled - transacciones realizadas la conciliación estado correcto
     *          statusConciliation - estado de la conciliación 0- No existe, 1 pendiente con errores para conciliar, 2 sin errores conciliado
     */
    async updateDetailAndRecalculateHeader(
        institutionCode: number,
        cutOffDate: string,
        detailsUpdate: { id: number; reconciled: number; description: string }[]
    ): Promise<any> {
        try {
            const result = await this.conciliationRepository.updateDetailAndRecalculateHeader(institutionCode, cutOffDate, detailsUpdate);
            //si se detectan errores
            if (result.status === -1) {
                return {
                    status: -1,
                    message: result.message,
                    error: result.error
                }
            }

            return result;
        } catch (error) {
            await registerLogErrorAuto('error', error, 'Error a actualizar la cabecera de la conciliación de la institución ${institutionCode} en la fecha de corte ${cutOffDate}');
            console.error("Error al actualizar la conciliación:", error);
            return {
                status: -1,
                message: "No se pudo recuperar la conciliación",
                error: `Error al actualizar la conciliación: ${error}`,
            };
        }



    }


    /**
      * Encripta campos sencibles en la conciliación
      * @param detail Lista de detalles de las transacciones en la conciliación
      * @returns Lista con campos encriptados
      */
    private encryptDetailFields(detail: ConciliationDetail[]): ConciliationDetail[] {
        return detail.map(tx => ({
            ...tx,
            accountNumberInstitution: tx.accountNumberInstitution ? keyEncrypt(tx.accountNumberInstitution) : '',
            accountTypeIdInstitution: tx.accountTypeIdInstitution ? keyEncrypt(tx.accountTypeIdInstitution) : '',
            accountNumberSwitch: tx.accountNumberSwitch ? keyEncrypt(tx.accountNumberSwitch) : '',
            accountTypeIdSwitch: tx.accountTypeIdSwitch ? keyEncrypt(tx.accountTypeIdSwitch) : '',

        }));
    }


    /**
     * Desencripta campos sencibles en la conciliación
     * @param detail Lista de detalles de las transacciones en la conciliación
     * @returns Lista con campos encriptados
     */
    private desEncryptDetailFields(detail: ConciliationDetail[]): ConciliationDetail[] {
        return detail.map(tx => ({
            ...tx,
            accountNumberInstitution: tx.accountNumberInstitution ? keyDecrypt(tx.accountNumberInstitution) : '',
            accountTypeIdInstitution: tx.accountTypeIdInstitution ? keyDecrypt(tx.accountTypeIdInstitution) : '',
            accountNumberSwitch: tx.accountNumberSwitch ? keyDecrypt(tx.accountNumberSwitch) : '',
            accountTypeIdSwitch: tx.accountTypeIdSwitch ? keyDecrypt(tx.accountTypeIdSwitch) : '',
        }));
    }

}