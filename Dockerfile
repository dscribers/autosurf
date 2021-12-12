# base
FROM node:16.3-alpine as base

RUN apk update && apk add zip unzip libzip-dev git

RUN apk add --no-cache python2

WORKDIR /app

# build
FROM base as build

COPY --chown=1000:1000 package.json ./
COPY --chown=1000:1000 yarn.lock ./

RUN yarn

COPY --chown=1000:1000 . .

RUN yarn build
