# develop stage
FROM node:14.3-alpine as develop-stage
RUN apk --no-cache add curl
WORKDIR /app
COPY package.json ./
COPY yarn.lock ./
RUN yarn
COPY . .
