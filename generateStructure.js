const fs = require("fs");
const path = require("path");

const folders = [
  "src/application",
  "src/domain",
  "src/infrastructure/adapters",
  "src/infrastructure/config",
  "src/infrastructure/models",
  "src/interfaces"
];

const files = {
  "src/app.ts": "// Punto de entrada de la aplicación",
  "src/infrastructure/config/database.js": `const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("🔥 MongoDB conectado");
    } catch (error) {
        console.error("Error conectando a MongoDB:", error);
        process.exit(1);
    }
};

module.exports = connectDB;`,
  ".env": "MONGO_URI=mongodb://localhost:27017/hexagonal_db\nPORT=3000",
  "package.json": `{
    "name": "conciliacion-ws",
    "version": "1.0.0",
    "description": "Arquitectura Hexagonal para servicios web de sistema de conciliación",
    "main": "src/app.ts",
    "scripts": {
      "start": "node src/app.ts",
      "dev": "nodemon src/app.ts"
    },
    "dependencies": {
      "express": "^4.18.2",
      "mongoose": "^7.0.0",
      "dotenv": "^16.0.3"
    },
    "devDependencies": {
      "nodemon": "^2.0.22"
    }
  }`
};

// Crear carpetas
folders.forEach(folder => {
  const dirPath = path.join(__dirname, folder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Carpeta creada: ${folder}`);
  }
});

// Crear archivos
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    console.log(`📄 Archivo creado: ${filePath}`);
  }
});

console.log("✅ Estructura generada exitosamente.");
