import { Request, Response } from "express";
import { InstitutionService } from "../domain/InstitutionService";

export class InstitutionController {
  private institutionService: InstitutionService;

  constructor(institutionService: InstitutionService) {
    this.institutionService = institutionService;
  }

  async listInstitutions(req: Request, res: Response) {
    try {
      const institutions = await this.institutionService.listInstitutions();
      res.json(institutions);
    } catch (error) {
      console.error("Error fetching institutions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
