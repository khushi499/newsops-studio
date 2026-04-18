#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until node -e "const { Client } = require('pg'); const c = new Client({connectionString: process.env.DATABASE_URL}); c.connect().then(()=>c.end()).then(()=>process.exit(0)).catch(()=>process.exit(1));"; do
  sleep 2
done

echo "PostgreSQL is ready."
npx prisma db push
node prisma/seed.js || true
node src/server.js
