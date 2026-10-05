FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g bun

COPY package*.json ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN bun run build


FROM nginx:alpine

ENV API_UPSTREAM=http://gateway:8080

COPY --from=builder /app/dist /usr/share/nginx/html
COPY default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
