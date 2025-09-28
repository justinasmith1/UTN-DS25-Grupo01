FROM node:20-slim

WORKDIR /app

# 1. Copiar manifiestos de dependencia primero
COPY package.json package-lock.json ./

# 2. Simplificar la instalación: El base-image ya tiene npm.
# Quitamos 'npm cache clean' y 'npm i -g npm@latest' para evitar fallos.
RUN npm install

# 3. Copiar el resto del código
COPY . .

# Variables de entorno y puerto para Vite
EXPOSE 5173

# Esta variable ayuda a que la recarga en caliente (HMR) funcione bien en Docker
ENV CHOKIDAR_USEPOLLING=true

# Ejecución del servidor de desarrollo de Vite
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
