#!/usr/bin/env bash

DOMAIN_KEY=/tmp/domain.key
SIGNED_CHAIN=/tmp/signed_chain.crt

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -subj "/CN=$MAIN_HOST" -keyout $DOMAIN_KEY -out $SIGNED_CHAIN
kubectl create secret generic tls-cert \
  --from-file=$SIGNED_CHAIN --dry-run -o yaml | kubectl apply -f -
kubectl create secret generic tls-key \
  --from-file=$DOMAIN_KEY --dry-run -o yaml | kubectl apply -f -
if kubectl rollout restart deployment nginx; then
  echo "Starting nginx rollout!"
fi
