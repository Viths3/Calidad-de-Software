// Conexión a MongoDB
import { MongoClient, Db } from "mongodb";

import dotenv from "dotenv";
import { registerLogErrorAuto } from "../../utils/common";
dotenv.config();

//BASE MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://172.20.92.3:27017";
const DB_NAME = "chas_conciliation";

let dbInstance: Db;

/**
 * Establece la conexión a MongoDB si aún no existe una instancia activa.
 * 
 * @async
 * @function
 * @returns {Promise<Db>} Instancia de la base de datos MongoDB.
 * @throws {Error} Lanza un error si falla la conexión a MongoDB.
 */
export const connectDB = async (): Promise<Db> => {
  if (!dbInstance) {
    try {
      const client = new MongoClient(MONGO_URI);
      await client.connect();
      dbInstance = client.db(DB_NAME);
      console.log("✅ Conectado a MongoDB");
    } catch (error) {
      console.error("❌ Error al conectar a MongoDB:", error);
      //registro de error en el log
      registerLogErrorAuto('error', error, `Error al conectar a MongoDB`);      
      throw error;
    }
  }
  return dbInstance;
};