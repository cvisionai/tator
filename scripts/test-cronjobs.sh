#!/usr/bin/env bash
NameArray=("sizer" "prune-temp" "prune-media" "prune-localizations" "prune-states" "prune-leaves" "backup" "move-backup" "archive-media" "backup-media" "request-restore" "finish-restore" "expire-invitations" "expire-announcements" "expire-password-resets")

for name in ${NameArray[*]}; do
  echo ""
  echo ""
  echo "Testing ${name}-cron..."
  kubectl delete job ${name}-job
  kubectl create job --from=cronjob/${name}-cron ${name}-job
  while [ 1 ]; do
    sleep 1
    container_started=$(kubectl get pod -l job-name=${name}-job -o yaml | yq '.items[0].status.containerStatuses[0].started')
    if [ ${container_started} = "true" ]; then
      pod_name=$(kubectl get pod -l job-name=${name}-job -o yaml | yq '.items[0].metadata.name')
      echo "===Start logs for ${pod_name}==="
      kubectl logs -f ${pod_name}
      echo "===End logs for ${pod_name}==="
      break
    fi
  done
  while [ 1 ]; do
    state=$(kubectl get pod ${pod_name} -o yaml | yq '.status.containerStatuses[0].state | keys | .[0]')
    if [ ${state} != "running" ]; then
      break
    fi
  done
  reason=$(kubectl get pod ${pod_name} -o yaml | yq '.status.containerStatuses[0].state.'"${state}"'.reason')
  if [ ${state} = "waiting" ]; then
    echo "Pod in waiting state!"
    echo "Reason: ${reason}"
    exit 1
  fi
  if [ ${state} = "terminated" ]; then
    echo "Pod in terminated state!"
    echo "Reason: ${reason}"
    if [ ${reason} != "Completed" ]; then
      exit 1
    fi
  fi
done
