import { MongoDBInstitutionRepository } from "../infrastructure/repositories/MongoDBInstitutionRepository";
import { Institution } from "../infrastructure/models/Institution";

/**
 * Servicio de dominio para la gestión de instituciones financieras.
 * Se encarga de coordinar las operaciones relacionadas con instituciones,
 * utilizando el repositorio de infraestructura correspondiente.
 */

export class InstitutionService {
  // Repositorio que maneja el acceso a datos de instituciones
  private institutionRepository: MongoDBInstitutionRepository;
  /******************************************************/
  /**
   * Constructor del servicio.
   * @param institutionRepository - Repositorio de instituciones (implementado con MongoDB)
   */
  constructor(institutionRepository: MongoDBInstitutionRepository) {
    this.institutionRepository = institutionRepository;
  }
  /******************************************************/
  /**
   * Lista todas las instituciones registradas.
   * @returns Un array de objetos `Institution`.
   */
  async listInstitutions(): Promise<Institution[]> {
    return await this.institutionRepository.listInstitutions();
  }

  /******************************************************/
  /**
     * Busca el nombre de dominio (hostname o IP) asociado a una institución.
     * @param institutionCode - Código numérico de la institución.
     * @returns El dominio como string, o `null` si no se encuentra.
     */
  async findDomainIntitution(institutionCode: number): Promise<string | null> {
    return await this.institutionRepository.findDomainByCode(institutionCode);
  }
}
