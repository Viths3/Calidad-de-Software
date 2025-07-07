import * as archiver from "archiver";
import * as crypto from "crypto";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import { Db } from "mongodb";
import path from "path";
import { BCERecord } from "../infrastructure/models/BCERecord";
import { BCERecordDetail } from "../infrastructure/models/BCERecordDetail";
import { formatDateToLocalString, toLocalDateObject } from "../utils/common";
import { institutionsBCE } from "../utils/institutionsBCE";

export class BCERecordsService {
    private db: Db;
    private collectionName = "transaction_report";

    constructor(db: Db) {
        this.db = db;
    }

    public async crearRegistro(data: Record<string, Record<string, any>>, cutOffDate: string): Promise<string> {
        try {
            const detalles: BCERecordDetail[] = [];
            let totalTransacciones = 0;
            let montoTotal = 0;
    
            for (const sender in data) {
                for (const receiver in data[sender]) {
                    const tx = data[sender][receiver];
                    const detalle: BCERecordDetail = new BCERecordDetail(
                        institutionsBCE[sender],
                        institutionsBCE[receiver],
                        tx.total,
                        tx.transactionCount
                    );
                    totalTransacciones += tx.transactionCount;
                    montoTotal += tx.total;
                    detalles.push(detalle);
                }
            }
    
            const CODE_ACH = 431;
            const ACCOUNT_NUMBER = '1770028';
            const REMARKS = 'pagos electronicos pruebas red chas';
    
            const reportId = 1; // Obtener dinámicamente desde DB si es necesario
    
            const registro: BCERecord = new BCERecord(
                cutOffDate,
                reportId,
                detalles.length,
                montoTotal,
                CODE_ACH,
                ACCOUNT_NUMBER,
                REMARKS,
                detalles
            );
    
            const ruta = path.resolve(__dirname, '../../registrosBCE/');
            const nombreArchivo: string = 'registro' + registro.cutOffDate.split(' ')[0].replace(/\//g, '-');
            const contenido: string = this.convertirTexto(registro);
    
            await this.escribirArchivo(ruta, nombreArchivo + '.txt', contenido);
    
            const rutaFinal = await this.empaquetarArchivos(ruta, nombreArchivo);
    
            const jsonRegistro: {
                cutOffDate: string;
                numberReferenceACH: number;
                recordsAmount: number;
                acumRecordsValues: number;
                codeACH: number;
                accountNumber: string;
                remarks: string;
                details: BCERecordDetail[];
                createdAt: Date;
                nombreArchivo: string;
                rutaDescarga: string;
                startDate: string;
                endDate: string;
                tipoArchivo: string;
            } = {
                cutOffDate: registro.cutOffDate,
                numberReferenceACH: registro.numberReferenceACH,
                recordsAmount: registro.recordsAmount,
                acumRecordsValues: registro.acumRecordsValues,
                codeACH: registro.codeACH,
                accountNumber: registro.accountNumber,
                remarks: registro.remarks,
                details: registro.details,
                createdAt: new Date(),
                nombreArchivo: nombreArchivo + '.zip',
                rutaDescarga: `${process.env.API_BASE_PATH}/registrosBCE/${nombreArchivo}.zip`,
                startDate: registro.cutOffDate,
                endDate: registro.cutOffDate,
                tipoArchivo: "zip"
            };
    
            await this.db.collection(this.collectionName).insertOne(jsonRegistro);
    
            console.log("Registro JSON guardado exitosamente en MongoDB.");
    
            return rutaFinal;
        } catch (error) {
            console.error("Error al crear el registro:", error);
            throw new Error(`Error al crear el registro: ${(error as Error).message}`);
        }
    }

    public convertirTexto(registro: BCERecord): string {
        let detalles: string = '';
        for (let det of registro.details) {
            let contenido = det.institutionCodeSender + ',' +
                det.institutionCodeReceiver + ',' +
                det.transactionAmount.toFixed(2) + ',' +
                det.transactionsTotal + '\n';
            detalles = detalles.concat(contenido);
        }

        let contenido: string = registro.cutOffDate + ',' +
            registro.numberReferenceACH + ',' +
            registro.recordsAmount + ',' +
            registro.acumRecordsValues.toFixed(2) + ',' +
            registro.codeACH + ',' +
            registro.accountNumber + ',' +
            registro.remarks + '\n' +
            detalles;
        return contenido;
    }

    public async escribirArchivo(ruta: string, nombreArchivo: string, contenido: string): Promise<void> {
        try {
            const rutaCompleta: string = path.join(ruta, nombreArchivo);
            if (!fs.existsSync(rutaCompleta)) {
                await fsPromises.mkdir(ruta, { recursive: true });
                console.log("Directorio creado: ", ruta);
            }
            await fsPromises.writeFile(rutaCompleta, contenido, 'utf-8');
            console.log('Archivo creado exitosamente en: ', rutaCompleta);

            const jsonRegistro = {
                createdAt: new Date(),
                nombreArchivo: nombreArchivo,
                contenido
            };

            await this.db.collection(this.collectionName).insertOne(jsonRegistro);
            console.log("Registro guardado en MongoDB");

        } catch (error) {
            throw new Error(`Error al crear el registro: ${(error as Error).message}`);
        }
    }

    public async empaquetarArchivos(ruta: string, nombreArchivos: string): Promise<string> {
        try {

            const nombreZip: string = path.join(ruta, nombreArchivos.replace('registro', 'psp1_') + '.zip');
            const output = fs.createWriteStream(nombreZip);
            const archive: archiver.Archiver = archiver.create('zip', {
                zlib: { level: 9 }
            });

            output.on('end', () => {
                console.log("Data has been drained");
            });

            archive.on('warning', (error) => {
                if (error.code === 'ENOENT') {
                    console.warn("Warning: ", error.message);
                } else {
                    console.error("Error: ", error.message);
                    throw error;
                }
            });

            archive.on('error', (error) => {
                throw error;
            });

            archive.pipe(output);

            archive.file(path.join(ruta, nombreArchivos + '.txt'), { name: nombreArchivos + '.txt' });
            archive.file(path.join(ruta, nombreArchivos + '.md5'), { name: nombreArchivos + '.md5' });

            archive.finalize();

            console.log('Archivo creado exitosamente en: ', nombreZip);

            return nombreZip;
        } catch (error) {
            throw new Error(`Error al empaquetar el reporte: ${(error as Error).message}`);
        }
    }


    public async listarReportes(limit: number, offset: number): Promise<{ reportes: any[], ultimoReporte: string | null, total: number }> {
        try {
            const collection = this.db.collection(this.collectionName);

            const total = await collection.countDocuments({});

            const registros = await collection
                .find({})
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit)
                .toArray();

            const reportes = registros.map((registro) => {
                const archivo = registro.nombreArchivo || "archivo_desconocido";

                // Convertimos la fecha UTC a fecha local correctamente
                const fechaCreacion = registro.createdAt ? toLocalDateObject(new Date(registro.createdAt)) : null;
                const fechaFormateada = fechaCreacion ? formatDateToLocalString(fechaCreacion) : null;

                const rutaDescarga = archivo.endsWith(".zip")
                    ? `${process.env.API_BASE_PATH}/registrosBCE/${archivo}`
                    : null;

                return {
                    startDate: registro.cutOffDate || fechaFormateada,
                    endDate: registro.cutOffDate || fechaFormateada,
                    description: registro.remarks || "Reporte sin descripción",
                    nombreArchivo: archivo,
                    tipoArchivo: registro.extension || "txt",
                    rutaDescarga,
                    sizeBytes: registro.sizeBytes || null,
                    createdAt: fechaFormateada,
                };
            });

            const ultimoReporte = reportes.length > 0 ? reportes[0].createdAt : null;

            return {
                reportes,
                ultimoReporte,
                total,
            };
        } catch (error) {
            throw new Error(`Error al listar los reportes: ${(error as Error).message}`);
        }
    }

}

