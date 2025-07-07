import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import fetchAPI from './fetchAPI';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/Guayaquil');

const ZONA_HORARIA = 'America/Guayaquil';

/*********************************************************
 * FUNCIONES DE FECHA Y HORA
 *********************************************************/

/**
 * Devuelve la fecha y hora actual en Date ajustada a UTC,
 * pero representando la hora local de Guayaquil.
 * reemplazo de new Date()
 */
export function getLocalTimeAsUTC(): Date {
    const local = dayjs().tz(ZONA_HORARIA);
    return dayjs.utc(local.format('YYYY-MM-DD HH:mm:ss.SSS')).toDate();
}

/**
 * Convierte un string (formato "YYYY-MM-DD HH:mm:ss.SSS") a Date ajustada a UTC
 * pero representando hora local de Guayaquil.
 */
export function parseStringDateToUTC(dateStr: string): Date {
    const local = dayjs.tz(dateStr, ZONA_HORARIA);
    return dayjs.utc(local.format('YYYY-MM-DD HH:mm:ss.SSS')).toDate();
}

/**
 * Formatea una fecha UTC como string en hora local de Guayaquil.
 */
export function formatDateToLocalString(date: Date): string {
    return dayjs(date).tz(ZONA_HORARIA).format('YYYY-MM-DD HH:mm:ss.SSS');
}

/**
 * Convierte una fecha UTC a string en hora local de Guayaquil. si la fecha ingresada ya esta en zona horaria local
 * Ejemplo de salida: "2025-03-20 00:00:00.000"
 */
export function dateToLocalString(date: Date): string {
    return dayjs(date).tz(ZONA_HORARIA).format('YYYY-MM-DD HH:mm:ss.SSS');
}
/**
 * Convierte una fecha UTC a un objeto Date con hora local de Guayaquil.
 * Útil para mostrar en consola o logs.
 */
export function toLocalDateObject(date: Date): Date {
    return dayjs(date).tz(ZONA_HORARIA).toDate();
}


/**
 * Devuelve el rango de fechas completas (inicio y fin del día) en hora local Ecuador.
 */
export function getDateRange(dateInit: string, dateFinish: string): { start: Date; end: Date } {
    const start = parseStringDateToUTC(`${dateInit} 00:00:00.000`);
    const end = parseStringDateToUTC(`${dateFinish} 23:59:59.999`);
    return { start, end };
}

/**
 * Devuelve el rango de fechas completas (inicio y fin del día) en strings .
 */
export function getDateRangeString(dateInit: string, dateFinish: string): { startStr: string; endStr: string } {
    const startStr = dateInit + "T00:00:00.000";
    const endStr = dateFinish + "T23:59:59.999";
    return { startStr, endStr };
}

/**
 * Trunca una fecha a las 00:00:00 UTC.
 */
export function getDateTruncate(date: Date): { truncateDate: Date } {
    const truncateDate = new Date(date.setUTCHours(0, 0, 0, 0));
    return { truncateDate };
}

/**
 * Formatea fecha tipo Date a 'YYYY-MM-DD'.
 */
export function formatDateYYYYMMDD(date: Date): string {
    try {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error("Fecha inválida proporcionada a formatDateYYYYMMDD");
        }
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error("Error formateando fecha en formatDateYYYYMMDD:", error);
        throw "Error formateando fecha en formatDateYYYYMMDD: "+ error;
    }
}

/**
 * Parsea una fecha string en formato "dd-MM-yyyy HH:mm:ss.SSS" a UTC.
 */
export function parseToUTCDate(dateStr: string): Date {
    try {
        //validamos que el parametro de ingreso sea un string
        if (typeof dateStr !== "string") {
            throw new Error("El valor proporcionado no es un string función parseToUTCDate");
        }
        //separamaos dia mes año  y validamos que los campos esten correctos
        const [day, month, yearAndTime] = dateStr.split("-");
        if (!day || !month || !yearAndTime) {
            throw new Error("Formato de fecha inválido. Se esperaba 'DD-MM-YYYY HH:mm:ss.SSS' función parseToUTCDate");
        }
        //separamos año y fecha y validamos que el esten en formato correcto
        const [year, time] = yearAndTime.split(" ");
        if (!year || !time) {
            throw new Error("Formato de año y hora inválido en el string de fech función parseToUTCDate");
        }
        //separamos hora minuto y segundos y vemos que los datos esten correctos
        const [hours, minutes, secondsWithMs] = time.split(":");
        if (!hours || !minutes || !secondsWithMs) {
            throw new Error("Formato de hora inválido en el string de fecha función parseToUTCDate");
        }
        //separamos los milisegundos y segundos
        const [seconds, milliseconds = "0"] = secondsWithMs.split(".");
        //convertimos la fech en utc
        const utcDate = new Date(Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds),
            parseInt(milliseconds.padEnd(3, "0"))
        ));

        if (isNaN(utcDate.getTime())) {
            throw new Error("Fecha generada inválida función parseToUTCDate");
        }

        return utcDate;

    } catch (error) {
        console.error("Error parseando fecha en parseToUTCDate:", error);
        throw error;
    }
}

/**
 * Arregla una cadena ISO sin tiempo para añadir hora por defecto.
 */
export function fixDateFormat(dateStr: any): string {
    const [datePart, timePart = '00:00:00.000'] = dateStr.split('T');
    const [hour = "00", minute = "00", second = "00.000"] = timePart.split(':');
    return `${datePart}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second}`;
}

/**
 * Parsea un string como UTC.  para mandar a base mongo consultas o fechas
 * dato de entrar por ejemplo 2025-03-27T00:00:00.000
 */
export function parseAsUTC(dateStr: string): Date {
    try {
        if (!dateStr || typeof dateStr !== 'string') {
            throw new Error("Fecha vacía o no es string");
        }
        // Asegura que use T en lugar de espacio y se agrega la Z al final
        const fixed = dateStr.replace(" ", "T");
        const iso = fixed.endsWith("Z") ? fixed : fixed + "Z";
        const date = new Date(iso);

        if (isNaN(date.getTime())) {
            throw new Error(`Formato de fecha inválido: ${dateStr}`);
        }

        return date;
    } catch (error) {
        console.error("Error al parsear fecha:", error);
        throw error; // o puedes retornar null si no quieres lanzar
    }
}

/*********************************************************
 * LOGS
 *********************************************************/

type LogTipo = 'error' | 'warning' | 'info';

const LOGS_URL = process.env.LOGS_URL || '';
const LOG_LEVEL = process.env.LEVEL || '';

export async function registerLogErrorAuto(
    tipo: LogTipo,
    error: unknown,
    contextoOpcional?: string
) {
    const isDebug = LOG_LEVEL.toUpperCase() === 'DEBUG';
    if (!LOGS_URL || (!isDebug && tipo === 'info')) return;

    const mensaje = (error instanceof Error)
        ? error.message
        : typeof error === 'string'
            ? error
            : JSON.stringify(error);

    const fecha = new Date().toISOString();
    const stack = new Error().stack || '';
    const callerMatch = stack.split('\n')[2]?.trim()?.match(/at (\S+)/);
    const funcion = callerMatch?.[1] || 'función desconocida';

    const logPayload = {
        tipo,
        mensaje,
        fecha,
        funcion,
        contexto: contextoOpcional || undefined
    };

    try {
        await fetchAPI(LOGS_URL, 'POST', logPayload);
        console.log(`Log automático enviado: [${tipo}] ${mensaje}`);
    } catch (e) {
        console.error('Error al registrar el log automático:', e);
    }
}

/*********************************************************
 * UTILIDADES VARIAS
 *********************************************************/

/**
 * Lista de servicios para transacciones.
 */
export function fetchServiceList(): string[] {
    return ["QR"];
}
