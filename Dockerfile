FROM oven/bun:1.3.9-alpine
WORKDIR /usr/src/app
RUN apk add curl su-exec jq 
COPY package.json bun.lock ./
RUN --mount=type=cache,target=$HOME/.bun/install/cache \
    bun install --frozen-lockfile --production

COPY --chown=bun:bun src/ /usr/src/app/src/
COPY --chown=bun:bun entrypoint.sh /usr/src/app/entrypoint.sh
COPY --chown=bun:bun tsconfig.json /usr/src/app/tsconfig.json

RUN mkdir /usr/src/app/cache
RUN chmod 700 /usr/src/app/cache
RUN chmod +x /usr/src/app/entrypoint.sh

EXPOSE 3000/tcp
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]