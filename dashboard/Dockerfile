FROM node:20-alpine AS builder
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_MAPBOX_TOKEN=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
