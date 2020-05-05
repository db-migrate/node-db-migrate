FROM node:10 AS builder

USER root

COPY .docker/all/build.sh package.json /data/

RUN /data/build.sh

FROM node:10-slim

COPY --from=builder /usr/local/ /usr/local/
COPY .docker/database.json /home/node

USER node
WORKDIR /home/node

ENTRYPOINT ["db-migrate"]
