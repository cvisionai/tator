#!/usr/bin/env bash

# The following must be supplied:
#   DOMAIN - domain name
#   DOMAIN_KEY - path to domain key file
#   SIGNED_CHAIN - path to signed certficate file
#   CERT_SECRET_NAME - name of kubernetes secret containing signed certificate
#   KEY_SECRET_NAME - name of kubernetes secret containing key
#
# Example:
#   DOMAIN=mysite.duckdns.org \
#   DOMAIN_KEY=/tmp/domain.key \
#   SIGNED_CHAIN=/tmp/signed_chain.crt \
#   CERT_SECRET_NAME=tls-cert \
#   KEY_SECRET_NAME=tls-key \
#   ./selfsigned.sh

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -subj "/CN=$MAIN_HOST" -keyout $DOMAIN_KEY -out $SIGNED_CHAIN
kubectl create secret generic $CERT_SECRET_NAME \
  --from-file=$SIGNED_CHAIN --dry-run -o yaml | kubectl apply -f -
kubectl create secret generic $KEY_SECRET_NAME \
  --from-file=$DOMAIN_KEY --dry-run -o yaml | kubectl apply -f -
if kubectl rollout restart deployment nginx; then
  echo "Starting nginx rollout!"
fi
