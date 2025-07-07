import { createServer } from "./interfaces/ExpressServer";

const PORT = process.env.PORT;

createServer().then(async (app) => {


  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error("❌ Error al iniciar el servidor:", error);
});
