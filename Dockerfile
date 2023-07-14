FROM node:lts-alpine as builder
WORKDIR /app
COPY package.json .
COPY yarn.lock .
RUN yarn install
COPY tsconfig.json .
COPY src ./src
RUN yarn build

FROM node:lts-alpine
WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist/ /app/
COPY --from=builder /app/package.json /app/package.json
CMD node --experimental-loader=extensionless index.js