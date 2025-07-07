// domain/AuthService.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Db } from "mongodb";
import { MongoDBUserRepository } from "../infrastructure/repositories/MongoDBUserRepository";
import { registerLogErrorAuto } from "../utils/common";

const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta_default";

/**
 * Servicio de autenticación de usuarios.
 * Encargado de verificar credenciales y generar tokens JWT para sesiones seguras.
 */
export class AuthService {
  private userRepository: MongoDBUserRepository;

  /**
   * Constructor del servicio, recibe una instancia de base de datos MongoDB.
   * @param db Conexión a la base de datos
   */
  constructor(db: Db) {
    this.userRepository = new MongoDBUserRepository(db);
  }

  /**
     * Autentica a un usuario verificando sus credenciales y devuelve un token JWT si es válido.
     * @param user Nombre de usuario
     * @param password Contraseña ingresada
     * @param institution_id ID de la institución asociada
     * @returns Token JWT si es válido o null si falla la autenticación
     */
  async authenticate(user: string, password: string, institution_id: string): Promise<string | null> {
    try {
      const foundUser = await this.userRepository.findByUserAndInstitution(user, institution_id);

      if (!foundUser) {
        console.log("Usuario no encontrado o no asociado a la institución");
        return null;
      }

      console.log("🔐 Password en DB:", foundUser.password);

      const isMatch = await bcrypt.compare(password, foundUser.password);
      if (!isMatch) {
        console.log("Contraseña incorrecta");
        return null;
      }

      // Generar token con datos adicionales del usuario
      const token = jwt.sign(
        {
          id: foundUser.id,
          user: foundUser.user,
          email: foundUser.email,
          name: foundUser.name,
          rol: foundUser.rol,
          institutionId: foundUser.institution_id,
          institutionName: foundUser.institution_name,
          initialDate: foundUser.initialDate,
          institutionCode: foundUser.code,
          lastConciliationDate: foundUser.lastConciliationDate,
          primaryColor: foundUser.primaryColor,
          secondaryColor: foundUser.secondaryColor,
          avatar: foundUser.avatar,
          logo: foundUser.logo,
          logoDark: foundUser["logo-dark"]
        },
        JWT_SECRET,
        { expiresIn: "2h" }
      );

      return token;
    } catch (error) {
      await registerLogErrorAuto('error', error, 'Error al autenticar usuario y obtencion de Token');
      console.error("Error en la autenticación:", error);
      throw error;
    }
  }
}
