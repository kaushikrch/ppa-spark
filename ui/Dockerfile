FROM node:20-slim
ENV PORT=3000
WORKDIR /ui
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]