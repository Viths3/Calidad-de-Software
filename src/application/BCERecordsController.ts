import { MongoDBTransactionSwitchRepository } from "../infrastructure/repositories/MongoDBTransactionSwitchRepository";
import { BCERecordsService } from "../domain/BCERecordsService";
import { Request, Response } from "express";

export class BCERecordsController {

    constructor(private servicioRegistros: BCERecordsService) { }

    // public async generarRegistro(req: Request, res: Response): Promise<Response> {
    //     try {
    //         await this.servicioRegistros.crearRegistro();
    //         return res.json({ message: "Se ha generado el registro" });
    //     } catch (error) {
    //         return res.status(500).json({ error: "Error al generar el registro" });
    //     }
    // }
}
