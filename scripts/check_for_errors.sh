#!/bin/bash

pod_name=$1

num_errors=`kubectl logs $pod_name | grep Error | wc -l`;
if [ $num_errors -gt 0 ]; then
  echo "Errors found in ${pod_name} log!"
  kubectl logs $pod_name | grep -U5 Error
  exit 255
else
  echo "$pod_name logs are clean!"
  exit 0
fi
