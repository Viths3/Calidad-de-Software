import { Db, MongoClient, ObjectId } from "mongodb";
import { User } from "../models/User";
import { registerLogErrorAuto } from "../../utils/common";

export class MongoDBUserRepository {
  private db: Db;
  private userCollection = "user";
  private institutionCollection = "institutions";
  private userInstitutionCollection = "user_institution";

  constructor(db: Db) {
    this.db = db;
  }

  async listUsers(): Promise<User[]> {
    const users = await this.db.collection(this.userCollection).find().toArray();
    return users.map((user: any) => new User(
      user._id.toString(),
      user.user,
      user.name,
      user.email,
      user.password,
      user.state,
      user.rol
    ));
  }

  async addUser(user: User, institutionCode: string): Promise<void> {
    try {
      const institution = await this.db
        .collection(this.institutionCollection)
        .findOne({ code: Number(institutionCode) });

      console.log("📩 Código recibido:", institutionCode);

      if (!institution) {
        throw new Error("Código de institución no válido");
      }

      // 2. Insertar usuario
      const result = await this.db.collection(this.userCollection).insertOne({
        user: user.user,
        name: user.name,
        email: user.email,
        password: user.password,
        state: user.state,
        rol: user.rol
      });

      // 3. Insertar relación en user_institution
      await this.db.collection(this.userInstitutionCollection).insertOne({
        user_id: result.insertedId,
        institution_id: institution._id
      });

    } catch (error) {
      console.error("❌ Error en addUser:", error);
      await registerLogErrorAuto("error", error, `Error al registrar usuario con institución ${institutionCode}`);
      throw error;
    }
  }

  // MongoDBUserRepository.ts
  async findByUserAndInstitution(
    user: string,
    institution_id: string
  ): Promise<{
    id: string;
    user: string;
    name: string;
    email: string;
    password: string;
    state: string;
    institution_id: string;
    institution_name: string;
    rol: string;
    code: number;
    initialDate: string;
    lastConciliationDate: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    avatar: string;
    logo: string;
    "logo-dark": string;

  } | null> {
    try {
      const foundUser = await this.db.collection(this.userCollection).findOne({ user });

      if (!foundUser) {
        console.log("Usuario no encontrado");
        return null;
      }
      const institutionObjectId = new ObjectId(institution_id);

      const userInstitution = await this.db.collection("user_institution").findOne({
        user_id: foundUser._id,
        institution_id: institutionObjectId
      });

      if (!userInstitution) {
        console.log("Usuario no está asociado a esa institución");
        return null;
      }
      const institution = await this.db.collection("institutions").findOne({ _id: institutionObjectId });

      if (!institution) {
        console.log("Institución no encontrada");
        return null;
      }

      // Buscar última conciliación
      const lastConciliation = await this.db.collection("conciliation")
        .find({ institutionCode: institution.code })
        .sort({ conciliationDate: -1 })
        .limit(1)
        .toArray();

      const lastConciliationDate = lastConciliation.length > 0
        ? lastConciliation[0].conciliationDate
        : null;
      const attributeInstitutions = await this.db.collection("attribute_institutions").findOne({ institutionCode: institution.code });

      if (!attributeInstitutions) {
        console.log("No contiene atributos la institución");
        return null;
      }
      return {
        id: foundUser._id.toString(),
        user: foundUser.user,
        name: foundUser.name,
        email: foundUser.email,
        password: foundUser.password,
        state: foundUser.state,
        rol: foundUser.rol,
        institution_id,
        institution_name: institution.name,
        code: institution.code,
        initialDate: institution.initialDate,
        lastConciliationDate,
        primaryColor: attributeInstitutions.primaryColor || null,
        secondaryColor: attributeInstitutions.secondaryColor || null,
        avatar: attributeInstitutions.avatar || '',
        logo: attributeInstitutions.logo || '',
        "logo-dark": attributeInstitutions["logo-dark"] || '',
      };
    } catch (error) {
      console.error("Error buscando usuario e institución:", error);
      //registro de error en el log
      await registerLogErrorAuto('error', error, `Se produjo un error al buscar los datos del user:  ${user} en institution_id: ${institution_id}`);
      //
      throw error;
    }
  }
  
  async deleteUserById(userId: string): Promise<void> {
    try {
      const objectId = new ObjectId(userId);
  
      // 1. Eliminar relación en user_institution
      await this.db.collection(this.userInstitutionCollection).deleteMany({ user_id: objectId });
  
      // 2. Eliminar usuario
      await this.db.collection(this.userCollection).deleteOne({ _id: objectId });
  
    } catch (error) {
      console.error("❌ Error al eliminar usuario:", error);
      await registerLogErrorAuto("error", error, `Error al eliminar usuario con ID ${userId}`);
      throw error;
    }
  }
  


}