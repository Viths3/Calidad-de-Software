

/hexagonal-node
  ├── /src
  │   ├── /application      # Casos de uso CONTROLLERS llamados a los servicios 
  │   ├── /domain           # Entidades y lógica de negocio (service)
  │   ├── /infrastructure   # configuracion, modelos y Repositorios 
  │   │   ├── /config       # Configuración a la base datos  y otras  (MongoDB)
  │   │   ├── /model     	# modelo de la base de datos   
  │   │   ├── /repositories	# Adaptadores para DB el que hace el manejo de la información     
  │   ├── /interfaces       # llamado de rutas 
  │   ├── /routes           # especificación de rutas en base a los cvontroladores 
  │   ├── app.ts         	# Servidor Express  - inicializa el servidor 
  ├── package.json
  ├── .env
  ├── README.md
  ├── tsconfig.json