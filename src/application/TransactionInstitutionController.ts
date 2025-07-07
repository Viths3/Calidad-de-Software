import { Request, Response } from "express";
import { TransactionInstitutionService } from "../domain/TransactionInstitutionService";
import { parseAsUTC } from "../utils/common";

/**
 * Controlador encargado de manejar las operaciones relacionadas con transacciones.
 */
export class TransactionInstitutionController {
    constructor(private transactionInstitutionService: TransactionInstitutionService) {
        this.transactionInstitutionService = transactionInstitutionService;
    }
    //********************************************************************************************* */
    /**
      * Ejecuta los servicios externos de cada institución para obtener las transacciones y las guarda en la colección de transactions_institution.
      *
      * @route POST /conciliations/save
      * @param req - Objeto Request con un objeto Conciliation completo en el body.
      * @param res - Objeto Response con el resultado de la operación.
      * 
      * en el body del servicio recibe como parametro 
      * @param {institucionCode, 
    *           startDate, 
    *           FinishDate,
    *           serviceList} req.body.conciliation  - recibe un json con esta información
    */
    async getExternalTransactionsInstitution(req: Request, res: Response): Promise<any> {
        try {
            const { institutionCode, startDate, endDate, serviceList } = req.body;
            if (!institutionCode || !startDate || !endDate || !serviceList) {
                return res.status(400).json({ status: -1, message: "Parámetros inválidos o incorrectos", error: "Error en parametros" });
            }

            const result = await this.transactionInstitutionService.getSaveExternalTransactions
                (
                    institutionCode,
                    startDate,
                    endDate,
                    serviceList
                );

            if (result.status === -1) {
                return res.status(400).json({
                    status: -1,
                    message: result.message,
                    error: result.error,
                });
            }
        } catch (error) {
            console.error('Error al obtener y guardas las transacciones externas:', error);
            res.status(500).json({
                id: null,
                message: "Se produjo un error general al al obtener y guardas las transacciones externas",
                error: error,
            });
        }

    }

    //********************************************************************************************* */
    /**
      * Guarda los datos de las transacciones de la institución si se envia por archivo o por medio de un json.
      *
      * @route POST /conciliations/save
      * @param req - Objeto Request con un objeto Conciliation completo en el body.
      * @param res - Objeto Response con el resultado de la operación.
      * 
      * en el body del servicio recibe como parametro 
      * @param {institucionCode, 
      *         transactionsInstitution,
      *         initialDate, 
      *         finishDate} req.body.conciliation  - recibe un json con esta información
      */
    async uploadInstitutionTransactions(req: Request, res: Response): Promise<any> {
        try {
            const {
                institutionCode,
                initialDate,
                finishDate,
                transactionsInstitution,

            } = req.body;

            // console.log("institutionCode", institutionCode)
            // console.log("initialDate", initialDate)
            // console.log("finishDate", finishDate);
            //console.log("trxs", transactionsInstitution);

            const validationResult = this.transactionInstitutionService.validateTransactionDateRange(transactionsInstitution, initialDate, finishDate);
            if (validationResult.status === -1) {
                return res.status(400).json({
                    status: -1,
                    message: validationResult.message,
                    error: validationResult.error + ".",
                });
            }

            const result = await this.transactionInstitutionService.saveTransactionsInstitution(institutionCode, validationResult.transactions, initialDate, finishDate);
            if (result.error !== "") {
                return res.status(500).json({
                    status: -1,
                    id: result.id,
                    message: result.message,
                    error: result.error + ".",
                });
            }

            res.status(200).json({
                status: 1,
                message: result.message,
                error: result.error,
            });
        } catch (error) {
            console.error('Error al guardar la transacciones de la institución:', error);
            res.status(500).json({
                status: -1,
                message: "Se produjo un error general al guardar las transacciones de la institución",
                error: ""+ error,
            });
        }
    }




}