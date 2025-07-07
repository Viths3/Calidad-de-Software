import express from "express";
import cors from "cors";
import userRouter from "../routes/UserRoutes";
import transactionRouter from "../routes/TransactionRoutes";
import conciliationRouter from "../routes/ConciliationsRoutes";
import transactionInstitutionRouter from "../routes/TransactionInstitutionRoutes";
import institutionAttributeRouter from "../routes/InstitutionAttributeRouter";
import path from "path";

const URL_FRONTEND_PORTAL = process.env.URL_FRONTEND_PORTAL || "http://localhost:3000";
const API_BASE_PATH = process.env.API_BASE_PATH;

export const createServer = async () => {
  const app = express();

  app.use(cors({
    origin: [URL_FRONTEND_PORTAL],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }));

    app.use(`${API_BASE_PATH}/registrosBCE`, express.static(path.join(__dirname,'/../../registrosBCE/')));
    console.log("Se sirve el directorio: ", path.join(__dirname,'/../../registrosBCE/'));

  app.use(express.json());

  //Prefijo para rutas de usuario
  app.use(`${API_BASE_PATH}/user`, userRouter);

  // prefijo para ruta de transacciones SQL
  app.use(`${API_BASE_PATH}/private/transaction`, transactionRouter);

  // prefijo para ruta de conciliation SQL
  app.use(`${API_BASE_PATH}/private/conciliation`, conciliationRouter);

  // prefijo para ruta de transacciones instituciones
  app.use(`${API_BASE_PATH}/private/transactionInstitution`, transactionInstitutionRouter);

  //prefijo para ruta de los atributos de las instituciones
  app.use(`${API_BASE_PATH}/private/institutionAttribute`, institutionAttributeRouter);

  return app;
};

