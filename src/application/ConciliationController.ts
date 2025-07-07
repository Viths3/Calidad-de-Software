import { Request, Response } from "express";
import { ConciliationService } from "../domain/ConciliationService";
import { Conciliation } from "../infrastructure/models/Conciliation";
import { TransactionInstitutionService } from "../domain/TransactionInstitutionService";
import { fetchServiceList, getDateRangeString, registerLogErrorAuto } from "../utils/common";

/**
 * Controlador encargado de manejar las operaciones relacionadas con conciliaciones.
 * Se comunica con el ConciliationService para ejecutar la lógica de negocio.
 */
export class ConciliationController {
    constructor(private conciliationService: ConciliationService,
                private transactionInstitutionService : TransactionInstitutionService
    ) { }

    /********************************************************************************
    /**
     * Ejecuta una conciliación con los parámetros proporcionados sin almacenar en la base solo
     * devuelve el resultado de la conciliación.
     *
     * @route POST /conciliations/execute
     * @param req - Request de Express que contiene institutionCode y cutOffDate en el body.
     * @param res - Response de Express que retorna el resultado de la ejecución o un error.
     * 
     * en el servicio  los parametros a recibir son los siguientes 
     * @param {string} req.body.institutionCode - Código de la institución a conciliar.
     * @param {string} req.body.cutOffDate - Fecha de corte de la conciliación en formato YYYY-MM-DD.
     * re
     */
    async getExecuteConciliation(req: Request, res: Response) {
        try {
            const {
                institutionCode,
                //    cutOffNumber, 
                cutOffDate
            } = req.body;

            if (!institutionCode || !cutOffDate) {
                return res.status(400).json({ status: -1, message: "Parámetros inválidos o incorrectos", error: "Error en parametros" });
            }
            const result = await this.conciliationService.executeConciliation(
                institutionCode,
                //"",
                cutOffDate
            );
            if (result.error === "") {
                res.json(result.conciliation);
            } else {
                res.json({
                    status: -1,
                    message: result.message,
                    error: result.error,
                })
            }

        } catch (error) {
            await registerLogErrorAuto('error', error, `Error al ejecutar conciliación para institución`);
            res.status(500).json({ status: -1, message: "Error:" + error });

        }


    }

    /**
      * Guarda una conciliación en la base de datos.
      *
      * @route POST /conciliations/save
      * @param req - Objeto Request con un objeto Conciliation completo en el body.
      * @param res - Objeto Response con el resultado de la operación.
      * 
      * en el body del servicio recibe como parametro 
      * @param {Conciliation} req.body.conciliation  - recibe un json de tipo conciliation 
      */
    async save(req: Request, res: Response): Promise<any> {
        try {
            const conciliation: Conciliation = req.body;
            const result = await this.conciliationService.saveConciliacion(conciliation);
            if (result.error !== "") {
                return res.status(500).json({
                    status: -1,
                    id: result.id,
                    message: result.message,
                    error: result.error,
                });
            }

            res.status(200).json({
                status: 1,
                id: result.id,
                message: result.message,
                error: result.error,
            });
        } catch (error) {
            console.error('Error al guardar la conciliación:', error);
            await registerLogErrorAuto('error', error, `Error al guardar la conciliación:`);
            res.status(500).json({
                status: -1,
                id: null,
                message: "Se produjo un error general al guardar la conciliación",
                error: error,
            });
        }
    }

    /**
    * Controlador para listar conciliaciones por estado.
    * 
    * Este endpoint recibe el código de institución, una fecha inicial y el estado de la conciliación,
    * y devuelve un listado de conciliaciones que cumplen con esos criterios.
    * 
    * @route POST /conciliations/list-by-status
    * @param req - Objeto Request de Express, con campos en el body: institucionCode, initialDate, status.
    * @param res - Objeto Response de Express para enviar la respuesta.
    * @returns Respuesta JSON con el listado de conciliaciones o un mensaje de error.
    * 
    * en el json de llamado al servicio se recibe estos parametros 
    *  @param {string} req.body.institutionCode - Código de la institución.
     * @param {string} req.body.initialDate - Fecha inicial en formato YYYY-MM-DD.
     * @param {number} req.body.status - Estado de la conciliación a filtrar.
    */
    async listConciliationsByStatus(req: Request, res: Response): Promise<Response> {
        try {
            const { institutionCode, initialDate, status } = req.body;

            // Validación de parámetros requeridos
            if (!institutionCode || !initialDate || status === undefined) {
                return res.status(400).json({ error: "Se requieren campos 'institutionCode', 'initialDate' y 'status' en el body." });
            }

            // Validación del formato de la fecha
            if (!/^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
                return res.status(400).json({ error: "Formato de fecha incorrecto. Usa 'YYYY-MM-DD'." });
            }

            // Llamada al servicio
            const transactions = await this.conciliationService.listConciliationsByStatus(
                institutionCode,
                initialDate,
                status
            );

            return res.json(transactions);

        } catch (error) {
            //console.error("Error en listConciliationsByStatus:", error);
            const message = error instanceof Error ? error.message : "Error desconocido";
            await registerLogErrorAuto('error', error, `Error al obtener listado de conciliaciones: ${message}`);            
            return res.status(500).json({
                message: "Error al obtener listado de conciliaciones",
                error: message
            });
        }
    }

    /*************************************************************************************
    /**
     * Ejecuta una conciliación y la guarda completamente.
     *
     * @route POST /conciliations/process
     * @param req - Objeto Request con los datos necesarios en el body.
     * @param res - Objeto Response con los datos de conciliación procesada o error.
     * 
     * en el servicio recibe estos párametros 
     * @param {string} req.body.institutionCode - Código de la institución.
     * @param {string} req.body.cutOffDate - Fecha de corte de la conciliación en formato YYYY-MM-DD.
     */
    async processConciliationCompletely(req: Request, res: Response): Promise<any> {
        let conciliationData: Conciliation;
        try {
            const {
                institutionCode,
                //    cutOffNumber, 
                cutOffDate,
            } = req.body;
            //0. validamos los datos 
            if (!institutionCode || !cutOffDate) {
                return res.status(400).json({ status: -1, message: "Parámetros inválidos o incorrectos", error: "Error en parametros" });
            }
            const {startStr , endStr} = getDateRangeString(cutOffDate,cutOffDate);
            const serviceList: string[]= fetchServiceList();

            //1. Ejecutamos el servicio externo para instituciones en caso de que tenga configurado 
            const resultTransactions = await this.transactionInstitutionService.getSaveExternalTransactions(institutionCode,startStr,endStr,serviceList);
            if(resultTransactions.status===-1){
                return res.status(400).json({
                    message: resultTransactions.message,
                    error: resultTransactions.error,
                }); 
            }

            //2. Ejecutamos la conciliación 
            const result = await this.conciliationService.executeConciliation(
                institutionCode,
                //"",
                cutOffDate
            );
            conciliationData = result.conciliation;
            //3. Grabamos la información    
            const resultSave = await this.conciliationService.saveConciliacion(conciliationData);

            if (resultSave.error !== "") {
                return res.status(500).json({
                    message: result.message,
                    error: result.error,
                });
            }

            res.status(200).json({
                institutionCode: institutionCode,
                cutOffDate: cutOffDate,
                conciliationDate: conciliationData.conciliationDate,
                transactionCount: conciliationData.transactionCount,
                transactionError: conciliationData.transactionError,
                transactionOk: conciliationData.transactionOk,
                pending: conciliationData.pending,
                reconciled: conciliationData.reconciled,
                statusConciliation: conciliationData.statusConciliation,    // 0 no existe conciliacion,  1 en proceso conciliacion con pendientes,  2  ok conciliacion con cero pendientes
                debitTotalConciled: conciliationData.debitTotalConciled,
                creditTotalConciled: conciliationData.creditTotalConciled,
                netAmountConciled: conciliationData.netAmountConciled,
                debitTotal: conciliationData.debitTotal,
                creditTotal: conciliationData.creditTotal,
                netAmount: conciliationData.netAmount,   
                _id: resultSave.id
            });


        } catch (error) {
            await registerLogErrorAuto('error', error, `Error al ejecutar el proceso completo de conciliación`);  
            res.status(500).json({ status: -1, message: "Error:" + error });

        }
    }

    //******************************************************************** */
    /**
    * Obtiene el detalle de la conciliación por fecha de corte y filtrado por estado.
    *
    * @route POST /conciliations/get-by-date
    * @param req - Objeto Request con los datos necesarios en el body.
    * @param res - Objeto Response con la conciliación encontrada o error.
    * 
    * parametros en el servicio 
    * @param {string} req.body.institutionCode - Código de la institución.
    * @param {string} req.body.cutOffDate - Fecha de corte en formato YYYY-MM-DD.
    * @param {number} [req.body.stateFilter] - Filtro opcional de estado. 
    *                                          -1  devuelve todos 
    *                                           0  todos los que estan con error
    *                                           1  todos los que estan con estado OK      

    */
    async getDetailConciliationByCutOffDate(req: Request, res: Response): Promise<any> {
        try {
            const { institutionCode, cutOffDate, stateFilter } = req.body;

            if (!institutionCode || !cutOffDate) {
                return res.status(400).json({ status: -1, message: "Parámetros inválidos o incorrectos", error: "Error en parametros" });
            }

            const result = await this.conciliationService.getDetailConciliationByCutOffDate(institutionCode, cutOffDate, stateFilter);

            if (result.error !== "") {
                return res.status(500).json({
                    message: result.message,
                    error: result.error,
                });
            }
            const conciliationData = result.conciliation;
            res.status(200).json(
                conciliationData
            );

        } catch (error) {
            res.status(500).json({ status: -1, message: "Error:" + error });

        }
    }

    //******************************************************************** */
    /**
    * Actualiza el detalle de las conciliaciones status y descripcion por id del registro de detalle y
    * así como la cabecera en los totales de numero de transacciones, con error, ok, pendientes, conciliadas 
    * y el estado de la conciliación
    *
    * @route POST /conciliations/get-by-date
    * @param req - Objeto Request con los datos necesarios en el body.
    * @param res - Objeto Response con los datos de conciliación actualziada o  error.
    * 
    * parametros en el servicio 
    * @param {string} req.body.institutionCode - Código de la institución.
    * @param {string} req.body.cutOffDate - Fecha de corte en formato YYYY-MM-DD.
    * @param {Array} [req.body.detailsUpdate] - array de detalles con los campos a actualizar {id,renciled,descripcion}     

    * Si se ejecuta correctamente devuelv cabecera de la conciliación con los datos actualizados de:  
    *          institutionCode - codigo de la institución
    *          cutOffDate - fecha de corte a actualizar
    *          editDate - fecha y hora de actualización
    *          transactionCount - Transacciones totales, 
    *          transactionError - número de transacciones con error
    *          pending - número de transacciones pendientes de conciliar
    *          reconciled - transacciones realizadas la conciliación estado correcto
    *          statusConciliation - estado de la conciliación 0- No existe, 1 pendiente con errores para conciliar, 2 sin errores conciliado
    */
    async updateDetailAndRecalculateHeader(req: Request, res: Response): Promise<any> {
        try {
            const { institutionCode, cutOffDate, detailsUpdate } = req.body;
            if (!institutionCode || !cutOffDate || !detailsUpdate) {
                return res.status(400).json({ status: -1, message: "Parámetros inválidos o incorrectos", error: "Error en parametros" });
            }
 
            const result = await this.conciliationService.updateDetailAndRecalculateHeader(institutionCode, cutOffDate, detailsUpdate);

            if (result.error !== "") {
                return res.status(500).json({
                    message: result.message,
                    error: result.error,
                });
            }

            res.status(200).json({
                institutionCode: result.institutionCode,
                cutOffDate: result.cutOffDate,
                editDate: result.editDate,
                transactionCount: result.transactionCount,
                transactionError: result.transactionError,
                transactionOk: result.transactionOk,
                pending: result.pending,
                reconciled: result.reconciled,
                statusConciliation: result.statusConciliation,
            }                
            );


        } catch (error) {
            await registerLogErrorAuto('error', error, `Error al actualizar los detalles de las conciliaciones`);  
            res.status(500).json({ status: -1, message: "Error:" + error });

        }
    }


}