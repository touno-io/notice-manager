
FROM node:lts-alpine

LABEL MAINTAINER="Kananek T."

ENV TZ Asia/Bangkok
ENV NODE_ENV production

WORKDIR /app
COPY ./api ./api/
COPY index.js package.json yarn.lock ./

RUN yarn --production --frozen-lockfile

CMD ["yarn", "start"]