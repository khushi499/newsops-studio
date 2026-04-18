FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 5000

CMD ["./entrypoint.sh"]
