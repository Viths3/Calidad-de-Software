import express from "express";
import cors from "cors";
import userRouter from "../routes/UserRoutes";
import institutionAttributeRouter from "../routes/InstitutionAttributeRouter";
import path from "path";
import productoRoutes from "../routes/ProductoRouter";



const URL_FRONTEND_PORTAL = process.env.URL_FRONTEND_PORTAL || "http://localhost:3000";
const API_BASE_PATH = process.env.API_BASE_PATH;

export const createServer = async () => {
  const app = express();

  app.use(cors({
    origin: [URL_FRONTEND_PORTAL],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }));
  app.use(express.json());

  //Prefijo para rutas de usuario
  app.use(`${API_BASE_PATH}/user`, userRouter);

  //prefijo para ruta de los atributos de las instituciones
  app.use(`${API_BASE_PATH}/private/institutionAttribute`, institutionAttributeRouter);
app.use(`${API_BASE_PATH}/api/productos`, productoRoutes);
  return app;
};

