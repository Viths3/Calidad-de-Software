import { Collection, Db, InsertOneResult, InsertManyResult, ObjectId, } from "mongodb";
import { ConciliationDetail } from "../models/ConciliationDetail";
import { Transaction } from "../models/Transaction";
import { formatDateYYYYMMDD, getDateRange, getDateTruncate, parseStringDateToUTC, parseToUTCDate, registerLogErrorAuto } from '../../utils/common';
import { Conciliation } from "../models/Conciliation";
import { getLocalTimeAsUTC } from '../../utils/common';
import dayjs from "dayjs";
import { keyDecrypt } from "../../utils/security";
import { Query } from "mongoose";
/**
 * Repositorio MongoDB para manejar operaciones relacionadas a la entidad Conciliation.
 * Este repositorio actúa como adaptador entre la base de datos y el dominio.
 */
export class MongoDBConciliationRepository {

    private db: Db;
    private collectionConciliation: Collection;

    /************************************************************
     * Constructor del repositorio.
     * @param db - Instancia de la base de datos MongoDB.
     * @param client - Cliente MongoDB (necesario para iniciar transacciones).
     */
    constructor(db: Db) {
        this.db = db;
        this.collectionConciliation = db.collection("conciliation");
    }

    /************************************************************
     * Lista transacciones desde una colección específica filtradas por institución, número y fecha de corte.
     * @param collectionName - Nombre de la colección a consultar.
     * @param instCode - Código de la institución.
     * @param cutNumber - Número de corte.
     * @param cutOffDate - Fecha de corte.
     * @returns Lista de objetos Transaction.
     */
    async listTransactionByCollection(
        collectionName: string,
        instCode: number,
        //cutNumber: string,
        cutOffDate: string
    ): Promise<Transaction[]> {
        const { start, end } = getDateRange(cutOffDate, cutOffDate);
        //const start = formatDateYYYYMMDD(parseToUTCDate(`${cutOffDate} 00:00:00.000`));
        //const end = formatDateYYYYMMDD(parseToUTCDate(`${cutOffDate} 23:59:59.999`));        
        const query = {
            institutionCode: instCode,
            //cutOffNumber: cutNumber,
            transactionDate: {
                $gte: start,
                $lte: end
            }
        };
        const transactions = await this.db.collection(collectionName)
            .find(query)
            .sort({ uuid: 1, transactionDate: 1 })
            .toArray();
        return transactions.map((row: any) => new Transaction(
            row._id,
            row.uuid,
            row.cutOffNumber,
            row.cutOffDate,
            row.transactionDate,
            keyDecrypt(row.accountTypeId),      //desencriptamos la información
            keyDecrypt(row.accountNumber),      //desencriptamos la información
            row.transactionValue,
            row.movementCode,
            row.transactionType,
            row.institutionCode,
            row.serviceCod,
            row.transactionStatus,
            row.reverseMovementCode
        ));
    }



    /************************************************************
     * Guarda una conciliación en la colección correspondiente.
     * @param conciliation - Objeto Conciliation que se va a guardar.
     * @returns Un objeto con el ID del documento insertado, un mensaje y posible error.
     */
    async save(
        conciliation: Conciliation
    ): Promise<{ id: string, error: string }> {
        try {
            if (conciliation._id === undefined) {
                const result: InsertOneResult = await this.collectionConciliation.insertOne(conciliation);
                return {
                    error: "",
                    id: result.insertedId.toString()
                }
            } else {
                const result = await this.collectionConciliation.replaceOne(
                    { _id: conciliation._id },
                    conciliation,
                );

                return {
                    error: "",
                    id: conciliation._id.toString()
                };
            }

        } catch (error) {
            console.error("Error al guardar la conciliación:", error);
            //registro de error en el log
            await registerLogErrorAuto('error', error, `Error al guardar conciliación: ${conciliation.cutOffDate} institución: ${conciliation.institutionCode} `);
            return {
                error: "Error al guardar la conciliación:" + error,
                id: ""
            };
        }
    }


    /************************************************************
     * Borra una conciliación por el campo Id 
     * @param id - _id de base de la cabecera 
     * @returns Un objeto con el ID del documento insertado, un mensaje y posible error.
     */

    async deleteDetailById(id: string): Promise<void> {
        try {
            const result = await this.collectionConciliation.findOneAndDelete({ id });
            if (!result) {
                throw new Error(`Caberera con id ${id} no encontrado.`);
            }
        } catch (error) {
            console.error('Error eliminando la cabecera de la conciliación:', error);
            //registro de error en el log
            await registerLogErrorAuto('error', error, `Error borrando detalle por id: ${id}`);
            throw new Error('No se pudo eliminar la cabecera de la conciliacion');
        }
    }


    /************************************************************
     * Busca si existe guardada una conciliación por fecha de corte
     * @param cutOffDate - fecha de corte por el que se realiza la busqueda  
     * @returns Un objeto con el ID de la conciliación existente, si no existe devuelve "undefined"
     */
    async findConciliationIdByCutOff(
        institutionCode: number,
        cutOffDate: string,
        //cutOffNumber: string
    )
        : Promise<ObjectId | undefined> {
        try {

            const filter = {
                //cutOffNumber: cutOffNumber,
                institutionCode : institutionCode,
                cutOffDate: cutOffDate
            }
            const result = await this.collectionConciliation.findOne(filter);

            return result ? result._id : undefined;
        } catch (error) {
            console.error("Error buscando la conciliación por cutOffDate:", error);
            //registro de error en el log
            await registerLogErrorAuto('error', error, `Error buscando la conciliación por cutOffDate: ${cutOffDate} . Código institucion: ${institutionCode}`);

            return undefined;
        }
    }

    /**************************************************************
     * Obtiene un listado de conciliaciones dentro de un rango de fechas, agrupadas por día.
     * 
     * Si no hay conciliaciones para un día específico, se rellena con valores por defecto.
     * Opcionalmente, se puede filtrar por el estado de la conciliación.
     * 
     * @param institutionCode - Código de la institución.
     * @param initialDateStr - Fecha de inicio del rango (formato YYYY-MM-DD).
     * @param finalDateStr - Fecha final del rango (formato YYYY-MM-DD).
     * @param status - Estado de la conciliación (-1 para no filtrar, 0 no generados y pendiente, 1 solo pendientes, 2 ok.
     * @returns Lista de objetos de conciliación por día dentro del rango.
     * 
     */
    async listConciliationsByStatus(
        institutionCode: number,
        initialDateStr: string,
        finalDateStr: string,
        status: number
    ): Promise<any[]> {

        try {

            const filter: any = {
                cutOffDate: {
                    $gte: initialDateStr,
                    $lte: finalDateStr
                },
                institutionCode: institutionCode
            };

            // Consulta a MongoDB
            const conciliations = await this.collectionConciliation.find(filter, {
                projection: {
                    institutionCode: 1,
                    cutOffDate: 1,
                    conciliationDate: 1,
                    transactionCount: 1,
                    transactionError: 1,
                    transactionOk: 1,
                    pending: 1,
                    reconciled: 1,
                    statusConciliation: 1,
                    _id: 0
                }
            }).toArray();

            // Indexar resultados por fecha de corte
            const conciliationMap = new Map<string, any>();
            for (const item of conciliations) {
                conciliationMap.set(item.cutOffDate, item);
            }

            // Generar resultado asegurando que haya una entrada por día
            const result = [];
            let currentDate = parseStringDateToUTC(`${initialDateStr} 00:00:00.000`);
            const final = parseStringDateToUTC(`${finalDateStr} 00:00:00.000`);
            /*let currentDate = new Date(initialDateStr);
            const final = new Date(finalDateStr);*/

            while (currentDate <= final) {
                const key = formatDateYYYYMMDD(currentDate);
                //const key = currentDate.toISOString().split('T')[0];
                if (conciliationMap.has(key)) {
                    result.push(conciliationMap.get(key));
                } else {
                    result.push({
                        institutionCode: institutionCode,
                        cutOffDate: key,
                        conciliationDate: null,
                        transactionCount: 0,
                        transactionError: 0,
                        transactionOk: 0,
                        pending: 0,
                        reconciled: 0,
                        statusConciliation: 0
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Ordenar por fecha descendente
            result.sort((a, b) => new Date(b.cutOffDate).getTime() - new Date(a.cutOffDate).getTime());

            // Aplicar filtro por estado si corresponde
            if (status !== -1) {
                if (status === 0) {
                    return result.filter(item => item.statusConciliation < 2);
                }
                else {
                    return result.filter(item => item.statusConciliation === status);
                }
            }

            return result;

        } catch (error) {
            //console.error("Error en listConciliationsByStatus:", error);

            //registro de error en el log
            await registerLogErrorAuto('error', error, `Error listando conciliaciones por estado, código institucion: ${institutionCode}`);
            throw new Error("error repository:" + (error as Error).message);
        }
    }

    /**
     * Consulta el detalle de una conciliación por fecha de corte (cutOffDate) y aplica un filtro sobre los detalles
     * en base al campo "state" .
     *
     * @param cutOffDate - Fecha de corte de la conciliación (formato `YYYY-MM-DD`).
     * @param stateFilter - Filtro aplicado sobre el campo "state" si el valor es -1 devuelve todos  0 con error ,1 ok.
     * @returns listado de detalles de la conciliación.
     */

    async getDetailByCutOffDate(institutionCode: number, cutOffDate: string, stateFilter: number): Promise<ConciliationDetail[] | null> {
        try {
            const result = await this.collectionConciliation.findOne({ institutionCode, cutOffDate });

            if (!result) {
                return null;
            }

            // Filtrado de detalles según el stateFilter
            const filteredDetailsRaw = (result.details ?? []).filter((d: any) => {
                if (stateFilter === -1) return true;
                return d.state === stateFilter
            });

            const details: ConciliationDetail[] = filteredDetailsRaw.map((d: any) =>
                new ConciliationDetail(
                    d.id ?? 0,
                    d.state ?? 0,
                    d.observation ?? "",
                    d.reconciled ?? 0,
                    d.description ?? "",
                    d.uuid ?? "",
                    d.cutOffNumber ?? "",
                    d.cutOffDate,
                    d.transactionDateSwitch ,//? new Date(d.transactionDateSwitch) : undefined,
                    d.accountTypeIdSwitch ?? "",
                    d.accountNumberSwitch ?? "",
                    d.transactionValueSwitch ?? 0,
                    d.movementCodeSwitch ?? "",
                    d.transactionTypeSwitch ?? "",
                    d.institutionCodeSwitch ?? 0,
                    d.serviceCodeSwitch ?? "",
                    d.transactionStatusSwitch ?? 0,
                    d.reverseMovementCodeSwitch ?? "",
                    d.transactionDateInstitution,// ? new Date(d.transactionDateInstitution) : undefined,
                    d.accountTypeIdInstitution ?? "",
                    d.accountNumberInstitution ?? "",
                    d.transactionValueInstitution ?? 0,
                    d.movementCodeInstitution ?? "",
                    d.transactionTypeInstitution ?? "",
                    d.institutionCodeInstitution ?? 0,
                    d.serviceCodInstitution ?? "",
                    d.transactionStatusInstitution ?? 0,
                    d.reverseMovementCodeInstitution ?? "",
                    d.editDate ? getLocalTimeAsUTC(): undefined
                )
            );

            return details;
        } catch (error) {
            console.error("Error al obtener la conciliación por cutOffDate:", error);

            //registro de error en el log
            await registerLogErrorAuto('error', error, `Error obteniendo detalle conciliación Institución: ${institutionCode}`);            
            throw new Error(`Error al obtener la conciliación: ${error}`);
        }
    }

    //*********************************************************************************
    /**
    * Actualiza un detalle específico dentro de la conciliación por institutionCode, cutOffDate e id del detalle.
    * Luego recalcula y actualiza los totales de la cabecera: transactionCount, transactionError, transactionOk, pending, reconciled .
    *
    * @param institutionCode - Código de la institución.
    * @param cutOffDate - Fecha de corte (formato YYYY-MM-DD).
    * @param detailsToUpdate - Lista de objetos con los campos a actualizar en los detalles.
    */
    async updateDetailAndRecalculateHeader(

        institutionCode: number,
        cutOffDate: string,
        detailsUpdate: { id: number; reconciled: number; description: string }[]
    ): Promise<any> {
        let conciliationDetail: ConciliationDetail[] = [];


        try {
            // Paso 1: Actualizar cada detalle individualmente
            for (const detail of detailsUpdate) {
                const editDate = getLocalTimeAsUTC(); // Hora actual en formato UTC de Ecuador

                await this.collectionConciliation.updateOne(
                    {
                        institutionCode,
                        cutOffDate,
                        "details.id": detail.id
                    },
                    {
                        $set: {
                            "details.$.reconciled": detail.reconciled,
                            "details.$.description": detail.description,
                            "details.$.editDate": editDate

                        }
                    }
                );
            }
            // Paso 2: Obtener documento actualizado
            const conciliation = await this.collectionConciliation.findOne({
                institutionCode,
                cutOffDate
            });

            if (!conciliation) {
                return {
                    status: -1,
                    error: "Conciliación no encontrada.",
                    message: "No se pudo actualiar la conciliación"
                }
            }

            // Paso 3: Recalcular los totales desde el arreglo `details`            
            const conciliationDetail = conciliation.details;

            const newTransactionCount = conciliationDetail.length; //numero de transacciones
            const newTransactionError = conciliationDetail.filter((c: { state: number; }) => c.state === 0).length;
            const newTransactionOk = conciliationDetail.filter((c: { state: number; }) => c.state === 1).length;
            const newPending = conciliationDetail.filter((c: { reconciled: number; }) => c.reconciled === 0).length;
            const newReconciled = conciliationDetail.filter((c: { reconciled: number; }) => c.reconciled === 1).length;
            const statusConciliation = (newPending === 0) ? 2 : 1;
            const editDate = getLocalTimeAsUTC();

            // Paso 4: Actualizar cabecera con nuevos totales
            await this.collectionConciliation.updateOne(
                { institutionCode, cutOffDate },
                {
                    $set: {

                        transactionCount: newTransactionCount,
                        transactionError: newTransactionError,
                        transactionOk: newTransactionOk,
                        pending: newPending,
                        reconciled: newReconciled,
                        statusConciliation: statusConciliation,
                        editDate: editDate,

                    }
                }
            );
            return {
                institutionCode: institutionCode,
                cutOffDate: cutOffDate,
                editDate: editDate,
                transactionCount: newTransactionCount,
                transactionError: newTransactionError,
                transactionOk: newTransactionOk,
                pending: newPending,
                reconciled: newReconciled,
                statusConciliation: statusConciliation,
                status: 1,
                error: "",
                message: "Conciliación actualizada",
            }
        } catch (error) {
            return {
                status: -1,
                error: error,
                message: "Error al actualizar la conciliación",
            }

        }
    }

}
