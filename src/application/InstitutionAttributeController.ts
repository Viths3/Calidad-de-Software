import { Request, Response } from "express";
import { InstitutionAttributeService } from "../domain/InstitutionAttributeService";

export class InstitutionAttributeController {
    constructor(private service: InstitutionAttributeService) { }

    async list(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 10;
            const offset = parseInt(req.query.offset as string) || 0;

            const { items, total } = await this.service.getAllWithInstitutionNamePaginated(limit, offset);
            const totalPages = Math.ceil(total / limit);

            res.status(200).json({ items, total, totalPages });
        } catch (error) {
            res.status(500).json({ error: "Error al listar atributos" });
        }
    }

    async getAvailable(req: Request, res: Response) {
        try {
            const data = await this.service.getAvailableInstitutions();
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener instituciones disponibles" });
        }
    }
    async getByInstitutionCode(req: Request, res: Response) {
        try {
            const code = Number(req.params.code);
            const data = await this.service.getByInstitutionCode(code);
            if (!data) return res.status(404).json({ error: "No se encontró atributo para ese código" });
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener atributo por código" });
        }
    }



    async get(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const data = await this.service.getById(id);
            if (!data) return res.status(404).json({ error: "No encontrado" });
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener atributo" });
        }
    }

    async create(req: Request, res: Response) {
        try {
            await this.service.create(req.body);
            res.status(201).json({ message: "Atributo creado correctamente" });
        } catch (error) {
            res.status(500).json({ error: "Error al crear atributo" });
        }
    }

    async updateByInstitutionCode(req: Request, res: Response) {
        try {
            const code = parseInt(req.params.code);
            if (isNaN(code)) {
                return res.status(400).json({ error: "institutionCode inválido" });
            }

            await this.service.updateByInstitutionCode(code, req.body);
            res.status(200).json({ message: "Atributo actualizado correctamente por institutionCode" });
        } catch (error) {
            res.status(500).json({ error: "Error al actualizar atributo", message: (error as Error).message });
        }
    }


    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await this.service.delete(id);
            res.status(200).json({ message: "Atributo eliminado" });
        } catch (error) {
            res.status(500).json({ error: "Error al eliminar atributo" });
        }
    }
}
