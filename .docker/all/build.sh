#!/bin/bash
export DBMVERSION=$(node -e 'console.log(require("/data/package.json").version)')

npm i -g npm
npm i -g db-migrate{@$DBMVERSION,-{pg,cockroachdb,mysql,mongodb,sqlite3}@latest} pg-native --unsafe-perm
