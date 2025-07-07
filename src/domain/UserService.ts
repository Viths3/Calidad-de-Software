import { ObjectId } from "mongodb";
import { User } from "../infrastructure/models/User";

/**
 * Interfaz que define el contrato para operaciones de acceso a datos de usuarios.
 */
export interface UserRepository {
  /**
   * Obtiene todos los usuarios registrados.
   * @returns Arreglo de usuarios
   */
  listUsers(): Promise<User[]>;
  /**
   * Agrega un nuevo usuario asociado a una institución.
   * @param user Objeto usuario a registrar
   * @param institutionCode Código de la institución a la que pertenece el usuario
   */
  addUser(user: User, institutionCode: string): Promise<void>;
  /**
   * Elimina un usuario por su ID.
   * @param userId ID del usuario a eliminar
   */
  deleteUserById(userId: string): Promise<void>;
}

/*************************************************************************/
/**
 * Servicio que gestiona las operaciones de dominio relacionadas con usuarios.
 */
export class UserService {
  constructor(private userRepository: UserRepository) { }

  /*************************************************************************/
  /**
   * Obtiene todos los usuarios registrados en el sistema.
   * @returns Lista de objetos User
   */
  async getAllUsers(): Promise<any[]> {
    const users = await this.userRepository.listUsers();
  
    const dbRepo = this.userRepository as any;
  
    const userInstitutionCol = dbRepo.db.collection("user_institution");
    const institutionCol = dbRepo.db.collection("institutions");
  
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const userInst = await userInstitutionCol.findOne({ user_id: new ObjectId(user.id) });
  
        if (userInst) {
          const institution = await institutionCol.findOne({ _id: userInst.institution_id });
  
          return {
            ...user,
            institutionName: institution?.name || null,
            institutionCode: institution?.code || null,
          };
        }
  
        return {
          ...user,
          institutionName: null,
          institutionCode: null,
        };
      })
    );
  
    return enrichedUsers;
  }
  


  /*************************************************************************/
  /**
   * Crea un nuevo usuario asociado a una institución específica.
   * @param user Objeto User a registrar
   * @param institutionCode Código de la institución
   */
  async createUser(user: User, institutionCode: string): Promise<void> {
    return await this.userRepository.addUser(user, institutionCode);
  }

  async deleteUserById(userId: string): Promise<void> {
    return await this.userRepository.deleteUserById(userId);
  }
  
}
