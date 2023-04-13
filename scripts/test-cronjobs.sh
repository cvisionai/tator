#!/usr/bin/env bash
NameArray=("updateprojects" "prunetemporaryfiles" "prunemedia" "prunelocalizations" "prunestates" "pruneleaves" "prunefiles" "movebackups" "archivemedia" "backupresources" "requestrestoration" "finishrestoration" "expireinvitations" "expireannouncements" "expirepasswordresets" "disableinactiveusers")

for name in ${NameArray[*]}; do
  echo ""
  echo ""
  echo "Testing management command ${name}..."
  echo "===Start logs for ${name}==="
  docker exec gunicorn python3 manage.py ${name} || { echo "${name} failed!"; exit 1; }
  echo "===End logs for ${name}==="
done
