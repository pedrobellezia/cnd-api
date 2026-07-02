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
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma 
COPY --from=builder /app/prisma ./prisma 
RUN mkdir /app/public
CMD ["npx", "pm2-runtime", "dist/index.js"]