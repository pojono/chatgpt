FROM node:lts-alpine as builder
WORKDIR /app
COPY package.json .
COPY yarn.lock .
RUN yarn install --production
RUN mv node_modules modules
RUN yarn install
COPY tsconfig.json .
COPY src ./src
RUN yarn run build:tsc

FROM node:lts-alpine
WORKDIR /app

# Install yt-dlp and its dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg \
    && pip3 install --break-system-packages --no-cache-dir yt-dlp

COPY --from=builder /app/modules /app/node_modules
COPY --from=builder /app/dist/ /app/
COPY --from=builder /app/package.json /app/package.json
CMD node app.js