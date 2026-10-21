FROM node:24-alpine
WORKDIR /app

ARG API_URL=http://api:4000
ARG SITE_URL=http://localhost:3000
ENV API_URL=$API_URL
ENV SITE_URL=$SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
