import { Db } from "mongodb";
import { Institution } from "../models/Institution";
import { registerLogErrorAuto } from "../../utils/common";

export class MongoDBInstitutionRepository {
  private db: Db;
  private collection = "institutions";

  constructor(db: Db) {
    this.db = db;
  }

  async listInstitutions(): Promise<Institution[]> {
    const institutions = await this.db.collection(this.collection).find().toArray();
    return institutions.map((institution: any) => new Institution(
      institution._id.toString(),
      institution.code,
      institution.name,
      institution.description
    ));
  }


  /***********************************************************************************
   * Busca una institución por su código numérico.
   * @param code Código numérico de la institución.
   * @returns Un objeto con `status` y `data`. 
   *          - `status: 1` si se encontró la institución (con los datos en `data`).
   *          - `status: -1` si no se encontró ninguna institución con ese código.
   */
  async findByCode(code: number): Promise<{ status: number, message: string, data?: Institution }> {
    const institution = await this.db.collection(this.collection).findOne({ code });

    if (!institution) {
      return {
        status: -1,
        message: "Datos de institución no encontrado para el codigo " + code
      }; // No se encontró ninguna institución con ese código
    }

    const result = new Institution(
      institution._id.toString(),
      institution.code,
      institution.name,
      institution.description
    );

    return { status: 1, message: "OK", data: result }; // Institución encontrada
  }


  /**
   * Busca y retorna el campo "domain" de una institución dado su código.
   * 
   * @param code - Código numérico de la institución.
   * @returns El valor del campo "domain" como string, o null si no se encuentra o ocurre un error.
   */
  async findDomainByCode(code: number): Promise<string | null> {
    try {
      const institution = await this.db.collection(this.collection).findOne(
        { code },
        { projection: { domain: 1 } } // Solo trae el campo "domain"
      );

      return institution?.domain || "";
    } catch (error) {
      //registro de error en el log
      await registerLogErrorAuto('error', error, `al buscar código: ${code}`);
      return "error"; // En caso de error, retorna null
    }
  }

}