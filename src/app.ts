import { createServer } from "./interfaces/ExpressServer";
import { createIndexes } from "./infrastructure/config/createIndexes"; 

const PORT = process.env.PORT;

createServer().then(async (app) => {

  await createIndexes();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error("❌ Error al iniciar el servidor:", error);
});
