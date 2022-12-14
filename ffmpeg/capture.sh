#/bin/bash

loadEnv() {
  DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  CONFIGS_PATH="${DIR}/app/config/streams"

  # load main .env file
  export $(egrep -v '^#' "${DIR}/.env" | xargs)
}

runConfigs() {
  CONFIG_FILES=$(ls -1 $CONFIGS_PATH/*.env | sed 's#.*/##')
  CONFIG_FILES_ARRAY=($(echo $CONFIG_FILES | tr " " "\n"))

  T=0
  for i in ${CONFIG_FILES_ARRAY[@]}; do
    T=$((T + 1))
    echo "${T}) ${i}"
    declare $(egrep -v '^#' "${CONFIGS_PATH}/${i}" | xargs)

    capture $STREAM_URL $STREAM_NAME $SEGMENT_TIME $STORE_FILE_PREFIX

    echo ""
  done
}

capture() {
  local STREAM_URL=$1
  local STREAM_NAME=$2
  local SEGMENT_TIME=$3
  local STORE_FILE_PREFIX=$4

  local STORE_FILE_PATH="${STORE_ROOT_PATH}/${STREAM_NAME}"
  local STORE_FILE_NAME="${STORE_FILE_PREFIX}_${STREAM_NAME}.mp4"
  local STORE_FILE="${STORE_FILE_PATH}/${STORE_FILE_NAME}"
  local STORE_SNAPSHOT="${STORE_FILE_PATH}/snapshot.png"
  local CMD_RECONNECT="-reconnect_on_network_error 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 300"

  if [ ! -d "${STORE_FILE_PATH}" ]; then
    mkdir "${STORE_FILE_PATH}"
  fi

  local SNAPSHOT_CMD="ffmpeg -y -frames 1 \"${STORE_SNAPSHOT}\" -rtsp_transport tcp -i \"${STREAM_URL}\""
  eval "${SNAPSHOT_CMD}"

  # check, if a snapshot exists. if not, the stream is not available
  if [ -f "${STORE_SNAPSHOT}" ]; then
    rm "${STORE_SNAPSHOT}"
  else
    sleep 3
    capture $STREAM_URL $STREAM_NAME $SEGMENT_TIME $STORE_FILE_PREFIX
  fi

  local CMD="ffmpeg -i \"${STREAM_URL}\" -vcodec copy -f segment -segment_time \"${SEGMENT_TIME}\" ${CMD_RECONNECT} -use_wallclock_as_timestamps 1 -reset_timestamps 1 -write_empty_segments 1 -strftime 1 -strftime_mkdir 1 \"${STORE_FILE}\""
#  local CMD="ffmpeg -i \"${STREAM_URL}\" -vcodec copy -f segment -segment_time \"${SEGMENT_TIME}\" -reset_timestamps 1 -write_empty_segments 1 -strftime 1 -strftime_mkdir 1 \"${STORE_FILE}\" </dev/null > /dev/null 2>&1 &"
  echo $CMD
  eval "${CMD}"
}

#------------------------------------

loadEnv
runConfigs

tail -f /dev/null
