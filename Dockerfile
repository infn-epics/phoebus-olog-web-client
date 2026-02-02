FROM node:22.13.1-alpine AS builder

LABEL maintainer="te-hung.tseng@ess.eu"
WORKDIR /usr/src/phoebus-olog-web-client
COPY . .
RUN npm ci
RUN npm run build --force

# Production stage with nginx (default)
FROM nginx:1.23.1-alpine AS nginx-server

COPY docker/default.conf /etc/nginx/conf.d
COPY --from=builder /usr/src/phoebus-olog-web-client/build /usr/share/nginx/html/

COPY --chmod=755 env.sh /docker-entrypoint.d/env.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# Alternative stage with Node.js serve (no nginx)
FROM node:22.13.1-alpine AS node-server

WORKDIR /usr/share/app
RUN npm install -g serve
COPY --from=builder /usr/src/phoebus-olog-web-client .
RUN chown --recursive node:node .
USER node
# Run env.sh and then serve
CMD ["/bin/sh", "-c", "./env.sh && serve -s build -l 8080"]

# Default to nginx-server
FROM nginx-server
