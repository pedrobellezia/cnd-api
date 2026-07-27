FROM node:20-alpine AS builder 
WORKDIR /app 
COPY package*.json ./ 
RUN npm ci 
COPY . . 
RUN npx prisma generate
RUN npx tsc

FROM node:20-alpine 
WORKDIR /app 
COPY package*.json ./ 
RUN npm ci --omit=dev 
COPY --from=builder /app/dist ./dist 
COPY --from=builder /app/src/generated/prisma ./dist/generated/prisma
COPY --from=builder /app/prisma ./prisma 
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN mkdir /app/public
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]