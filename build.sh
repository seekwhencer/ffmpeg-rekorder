#!/bin/bash

# load .env file and config file
loadConfig() {
    export DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    export $(egrep -v '^#' "${DIR}/.env" | xargs)
}

bundle() {
  cd "${DIR}/app"
  echo "BUNDLING..."
  node --experimental-modules --experimental-json-modules ./webpack-app-pkg.config.js
}

createBinary(){
  cd "${DIR}/app"
  pkg dist/app.js --output "${BUILD_FILENAME}" --targets "${BUILD_TARGET}" --compress GZip -d
}


#

loadConfig

echo ""

bundle
createBinary

#cd $DIR

