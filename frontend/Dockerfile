# Frontend Dockerfile
# Podés usar slim o bookworm según prefieras
FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm cache clean --force \
&& npm i -g npm@latest \
&& npm install

COPY . .

EXPOSE 5173

ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]