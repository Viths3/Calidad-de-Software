import { Request, Response } from "express";
import { TransactionsService } from "../domain/TransactionService";
import { getDateRange } from "../utils/common";
import { MongoDBTransactionSwitchRepository } from "../infrastructure/repositories/MongoDBTransactionSwitchRepository";
import { BCERecordsService } from "../domain/BCERecordsService";

/**
 * Controlador encargado de manejar las operaciones relacionadas con transacciones.
 */
export class TransactionController {
    constructor(private transactionService: TransactionsService, private recordsService: BCERecordsService) { }

    /**
     * Obtiene las transacciones de un rango de fechas específico y las almacena en MongoDB.
     *
     * @param req - Objeto de solicitud HTTP, espera en el body: fecha_inicio, fecha_fin (formato YYYY-MM-DD).
     * @param res - Objeto de respuesta HTTP.
     * @returns JSON con el mensaje de éxito y las transacciones procesadas, o un error.
     */

    async getAndStoreTransactionsByDateRange(req: Request, res: Response): Promise<Response> {
        try {
            const { fecha_inicio, fecha_fin } = req.body;

            if (!fecha_inicio || !fecha_fin) {
                return res.status(400).json({ error: "Se requieren fecha_inicio y fecha_fin en el body" });
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_fin)) {
                return res.status(400).json({ error: "Formato de fecha incorrecto. Usa YYYY-MM-DD." });
            }

            const transactions = await this.transactionService.findAndStoreTransactions(fecha_inicio, fecha_fin);
            return res.json({
                message: "Transacciones actualizadas en MongoDB",
                data: transactions
            });
        } catch (error) {
            return res.status(500).json({ error: "Error al obtener y almacenar transacciones", message: error });
        }
    }

    /**
     * Lista las transacciones del switch por institución dentro de un rango de fechas.
     * Acepta fechas en formato 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM:SS'.
     * Si las fechas no contienen hora, se ajustan con getDateRange para cubrir todo el día.
     *
     * @param req - Objeto de solicitud HTTP, espera institutioncode, startDate, finishDate, limit, offset.
     * @param res - Objeto de respuesta HTTP.
     * @returns JSON con la lista de transacciones o error.
     */
    async listTransactionSwitchbyInstitution(req: Request, res: Response): Promise<Response> {
        try {
            const { institutioncode, startDate, finishDate, limit, offset } = req.body;

            if (!institutioncode || !startDate || !finishDate) {
                return res.status(400).json({ error: "Se requieren institutioncode, startDate y finishDate en el body" });
            }

            const dataTransactions = await this.transactionService.listTransactionByInstitution(
                institutioncode,
                startDate,
                finishDate,
                limit || 15,
                offset || 0
            );

            return res.json({
                data: dataTransactions
            });

        } catch (error) {
            return res.status(500).json({
                error: error + ".",
                message: "Error al listar transacciones"
            });
        }
    }

    /**
     * Obtiene los totales de transacciones por institución en un rango de fechas.
     *
     * @param req - Objeto de solicitud HTTP, espera startDate, finishDate, institutionCode.
     * @param res - Objeto de respuesta HTTP.
     * @returns JSON con los totales o un mensaje de error.
     */
    async getTransactionTotals(req: Request, res: Response) {
        try {
            const { year, institutionCode } = req.body;

            if (!year || !institutionCode) {
                return res.status(400).json({ message: "Missing required query parameters" });
            }

            const totals = await this.transactionService.getTransactionTotals(
                year,
                institutionCode
            );

            return res.json(totals);
        } catch (error) {
            return res.status(500).json({ message: "Error obteniendo totales de transacciones", error: String(error) });
        }
    }

    /**
     * Obtiene un resumen de transacciones agrupadas por institución en un rango de fechas.
     *
     * @route POST /transactions/summary-by-institution
     * @param req Objeto de solicitud HTTP, startDate, endDate
     * @param res Objeto de respuesto HTTP, json con ruta para obtener el zip generado
     */
    async getTransactionSummaryByInstitution(req: Request, res: Response): Promise<any> {
        try {
            let start = '';
            let end = '';
            //Formato para las fechas YYYY-MM-DD HH:mm:ss
            const formatter = new Intl.DateTimeFormat("en-GB", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            });
            const fecha: Date = new Date(Date.now());
            const fechaStr: string[] = formatter.format(fecha).split(',');
            const cutOffDate = fechaStr[0].concat(fechaStr[1]);
            if(req.body.startDate && req.body.endDate){
                start = req.body.startDate;
                end = req.body.endDate;
            } else {
                let diasAntes: number = 1
                //Si el corte se realiza un lunes, se toman los 3 dias anteriores (viernes, sabado, domingo)
                if(fecha.getDay() === 1){
                    diasAntes = 3;
                }
                start = fecha.getFullYear() + '-' +
                    String(fecha.getMonth()+1).toString().padStart(2,'0') + '-' +
                    String(fecha.getDate()-diasAntes).toString().padStart(2,'0') + ' ' +
                    '00:00:00';
                end = fecha.getFullYear() + '-' +
                    String(fecha.getMonth()+1).toString().padStart(2,'0') + '-' +
                    String(fecha.getDate()-1).toString().padStart(2,'0') + ' ' +
                    '23:59:59';
            }
            console.log("Start: ", start);
            console.log("End: ", end);

            const result = await this.transactionService.getTransactionSummaryByInstitution(
                String(start),
                String(end)
            );

            const archivo = await this.recordsService.crearRegistro(result, cutOffDate);

            const ruta = `localhost:${process.env.PORT}${process.env.API_BASE_PATH}/` + archivo;

            console.log("Se genero el reporte entre las fechas: ", start, "; ", end);

            return res.status(200).json({ message: "Reporte para liquidación generado exitosamente", ruta: ruta });
            //return res.status(200).download(archivo);
        } catch (error) {
            console.error("Error al obtener resumen desde PostgreSQL:", error);
            return res.status(500).json({ error: "Error interno del servidor" });
        }
    }

    /**
       * Lista todos los reportes generados en la colección `transaction_report`.
       *
       * Devuelve un listado con la información básica de cada reporte:
       * - Fecha de inicio (`startDate`).
       * - Fecha de fin (`endDate`).
       * - Descripción del reporte (`description`).
       * - Nombre del archivo generado (`nombreArchivo`).
       * - Ruta del archivo en el sistema (`rutaArchivo`).
       * - Fecha de creación en MongoDB (`createdAt`).
       *
       * Además, devuelve la fecha (`ultimoReporte`) correspondiente al último reporte generado,
       * que puede ser utilizada para controlar duplicados o mostrar información reciente al usuario.
       *
       * @param req - Objeto de solicitud HTTP.
       * @param res - Objeto de respuesta HTTP.
       * @returns JSON con los reportes y la fecha del último reporte o un mensaje de error.
       */
    async listarReportes(req: Request, res: Response): Promise<Response> {
        try {
            const limit = parseInt(req.query.limit as string) || 10;
            const offset = parseInt(req.query.offset as string) || 0;

            const { reportes, ultimoReporte, total } = await this.recordsService.listarReportes(limit, offset);

            return res.status(200).json({ reportes, ultimoReporte, total });
        } catch (error) {
            console.error("Error al listar reportes:", error);
            return res.status(500).json({ error: "Error al listar los reportes" });
        }
    }

    /**
     * Devuelve el conteo mensual de transacciones por institución para un año dado.
     *
     * @param req - HTTP request con params: year e institutionCode
     * @param res - HTTP response con un array de 12 números
     */
    async monthlyTransactionCount(req: Request, res: Response): Promise<void> {
        try {
            const { year, institutionCode } = req.body;

            if (isNaN(year) || !institutionCode) {
                res.status(400).json({ message: "Parámetros inválidos. Se espera datos numéricos de año y codigo de institución." });
                return;
            }

            const data = await this.transactionService.monthlyTransactionCount(year, institutionCode);
            res.status(200).json({ data });
        } catch (error) {
            console.error("Error en conteo mensual de transacciones:", error);
            res.status(500).json({ message: "Error al obtener datos mensuales", error: String(error) });
        }
    }

}
