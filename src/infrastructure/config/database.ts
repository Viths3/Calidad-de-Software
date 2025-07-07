// Conexión a MongoDB
import { MongoClient, Db } from "mongodb";
// Conexión a PostgreSQL
import { Pool } from "pg";

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

//Base postgresql
const POSTGRES_URI = process.env.POSTGRES_URI || "postgresql://gestion:tacatacataca@172.20.91.7:5438/gti";
let postgresPool: Pool;

/**
 * Retorna una instancia singleton del pool de conexiones a PostgreSQL.
 * 
 * @function
 * @returns {Pool} Instancia del pool de PostgreSQL.
 * @throws {Error} Lanza un error si falla la conexión a PostgreSQL.
 */
export const connectPostgreSQL = (): Pool => {
  if (!postgresPool) {
    try {
      postgresPool = new Pool({ connectionString: POSTGRES_URI });
      console.log("✅ Conectado a PostgreSQL");
    } catch (error) {
      console.error("❌ Error al conectar a PostgreSQL:", error);
      //registro de error en el log
      registerLogErrorAuto('error', error, `Error al conectar a PostgreSQL`);
      throw error;
    }
  }
  return postgresPool;
};