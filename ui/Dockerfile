FROM node:20-slim
WORKDIR /ui
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "serve"]