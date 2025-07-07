import { Pool } from "pg";
import { TransactionRepository } from "../../domain/TransactionService";
import { TransactionSwitch } from "../models/TransactionSwitch";
import { parseStringDateToUTC } from "../../utils/common";

/**
 * Implementación del repositorio de transacciones que se conecta a una base de datos PostgreSQL.
 * Esta clase utiliza la librería `pg` para ejecutar consultas y retornar objetos `TransactionSwitch`.
 */
export class PostgreSqlTransactionRepository implements TransactionRepository {

    private pool: Pool;

    /**
     * Crea una nueva instancia del repositorio PostgreSQL.
     * @param pool - Instancia de conexión a PostgreSQL utilizando `pg.Pool`.
     */
    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Obtiene todas las transacciones confirmadas entre dos fechas.
     * Las transacciones se obtienen desde la tabla `gti_transacciones.transaccion`.
     * Se consideran tanto débitos como créditos, y se descartan aquellas con estado `SOLICITADO`.
     *
     * @param fechaInicio - Fecha de inicio en formato 'YYYY-MM-DD'.
     * @param fechaFin - Fecha de fin en formato 'YYYY-MM-DD'.
     * @returns Una promesa que resuelve en un arreglo de objetos `TransactionSwitch`.
     */
    async getTransactionsByDate(fechaInicio: string, fechaFin: string): Promise<TransactionSwitch[]> {
        try {
            const query = `
            SELECT
                a.uuid AS uuid,
                a.codigo_corte AS cutOffNumber,
                TO_CHAR(a.fecha_corte,'YYYY-MM-DD') AS cutOffDate,
                TO_CHAR(a.fecha_confirmacion, 'YYYY-MM-DD HH24:MI:SS.MS') AS transactionDate,
                a.tipo_cuenta_debito AS accountTypeId,
                a.numero_cuenta_debito AS accountNumber,
                ROUND(a.monto :: numeric, 2) AS transactionValue,
                a.id_movimiento_debito AS movementCode,
                'D' AS transactionType,
                a.codigo_institucion_debito AS institutionCode,
                a.codigo_servicio AS serviceCod,
                CASE WHEN a.estado = 'COMPLETADO' THEN 1 ELSE 0 END AS transactionStatus,
                a.id_movimiento_debito_reverso as reverseMovementCode,
                a.codigo_institucion_credito as institutionCodeReceiver
            FROM gti_transacciones.transaccion a
            WHERE CAST(a.fecha_confirmacion AS DATE) BETWEEN TO_DATE($1, 'YYYY-MM-DD') AND TO_DATE($2, 'YYYY-MM-DD')
                AND a.estado <> 'SOLICITADO'
            UNION
            SELECT
                b.uuid AS uuid,
                b.codigo_corte AS cutOffNumber,
                TO_CHAR(b.fecha_corte,'YYYY-MM-DD') AS cutOffDate,
                TO_CHAR(b.fecha_confirmacion, 'YYYY-MM-DD HH24:MI:SS.MS') AS transactionDate,
                b.tipo_cuenta_credito AS accountTypeId,
                b.numero_cuenta_credito AS accountNumber,
                ROUND(b.monto :: numeric, 2) AS transactionValue,
                b.id_movimiento_credito AS movementCode,
                'C' AS transactionType,
                b.codigo_institucion_credito AS institutionCode,
                b.codigo_servicio AS serviceCod,
                CASE WHEN b.estado = 'COMPLETADO' THEN 1 ELSE 0 END AS transactionStatus,
                b.id_movimiento_credito_reverso as reverseMovementCode,
                b.codigo_institucion_debito as institutionCodeReceiver
            FROM gti_transacciones.transaccion b
            WHERE CAST(b.fecha_confirmacion AS DATE) BETWEEN TO_DATE($1, 'YYYY-MM-DD') AND TO_DATE($2, 'YYYY-MM-DD')
                AND b.estado <> 'SOLICITADO'
            ORDER BY transactionDate, transactionType;
        `;

            const { rows } = await this.pool.query(query, [fechaInicio, fechaFin]);

            return rows.map(row => new TransactionSwitch(
                row.uuid,
                row.cutoffnumber,
                row.cutoffdate,
                parseStringDateToUTC(row.transactiondate),
                row.accounttypeid,
                row.accountnumber,
                parseFloat(row.transactionvalue),
                row.movementcode,
                row.transactiontype,
                row.institutioncode,
                row.servicecod,
                row.transactionstatus,
                row.reversemovementcode ?? '',
                row.institutioncodereceiver
            ));
        } catch (error) {
            console.error('❌ Error al obtener transacciones por fecha:', error);
            throw new Error('Error al consultar las transacciones desde la base de datos');
        }
    }

    /**
     * Obtiene todas las transacciones confirmadas entre dos fechas.
     * Las transacciones se obtienen desde la tabla `gti_transacciones.transaccion`.
     * Se consideran solo débitos, y se descartan aquellas con estado `SOLICITADO`.
     *
     * @param fechaInicio - Fecha de inicio en formato 'YYYY-MM-DD'.
     * @param fechaFin - Fecha de fin en formato 'YYYY-MM-DD'.
     * @returns Una promesa que resuelve en un arreglo de objetos `TransactionSwitch`.
     */
    async getDebitsByDate(fechaInicio: string, fechaFin: string): Promise<TransactionSwitch[]> {
        try {
            const query = `
            SELECT
                a.uuid AS uuid,
                a.codigo_corte AS cutOffNumber,
                TO_CHAR(a.fecha_corte,'YYYY-MM-DD') AS cutOffDate,
                TO_CHAR(a.fecha_confirmacion, 'YYYY-MM-DD HH24:MI:SS.MS') AS transactionDate,
                a.tipo_cuenta_debito AS accountTypeId,
                a.numero_cuenta_debito AS accountNumber,
                ROUND(a.monto :: numeric, 2) AS transactionValue,
                a.id_movimiento_debito AS movementCode,
                'D' AS transactionType,
                a.codigo_institucion_debito AS institutionCodeSender,
                a.codigo_institucion_credito AS institutionCodeReceiver,
                a.codigo_servicio AS serviceCod,
                CASE WHEN a.estado = 'COMPLETADO' THEN 1 ELSE 0 END AS transactionStatus,
                a.id_movimiento_debito_reverso as reverseMovementCode
            FROM gti_transacciones.transaccion a
            WHERE CAST(a.fecha_confirmacion AS DATE) BETWEEN DATE($1) AND DATE($2)
                AND a.estado = 'COMPLETADO'
                AND a.
            ORDER BY transactionDate, transactionType;
            `;
            /*
            const query = `
            SELECT
                a.uuid AS uuid,
                a.codigo_corte AS cutOffNumber,
                ROUND(a.monto :: numeric, 2) AS transactionValue,
                a.id_movimiento_debito AS movementCode,
                a.codigo_institucion_debito AS institutionCodeSender,
                a.codigo_institucion_credito AS institutionCodeReceiver,
                a.codigo_servicio AS serviceCod,
                CASE WHEN a.estado = 'COMPLETADO' THEN 1 ELSE 0 END AS transactionStatus,
                a.id_movimiento_debito_reverso as reverseMovementCode
            FROM gti_transacciones.transaccion a
            WHERE CAST(a.fecha_confirmacion AS DATE) BETWEEN TO_DATE($1, 'YYYY-MM-DD') AND TO_DATE($2, 'YYYY-MM-DD')
                AND a.estado = 'COMPLETADO'
            ORDER BY transactionDate, transactionType;
            `;*/

            const { rows } = await this.pool.query(query, [fechaInicio, fechaFin]);

            return rows.map(row => new TransactionSwitch(
                row.uuid,
                row.cutoffnumber,
                row.cutoffdate,
                parseStringDateToUTC(row.transactiondate),
                row.accounttypeid,
                row.accountnumber,
                parseFloat(row.transactionvalue),
                row.movementcode,
                row.transactiontype,
                row.institutioncodesender,
                row.servicecod,
                row.transactionstatus,
                row.reversemovementcode ?? '',
                row.institutioncodereceiver
            ));
        } catch (error) {
            console.error('❌ Error al obtener transacciones por fecha:', error);
            throw new Error('Error al consultar las transacciones desde la base de datos');
        }
    }
}
