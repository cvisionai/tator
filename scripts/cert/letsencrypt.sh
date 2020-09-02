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
#   ./letsencrypt.sh

ACCOUNT_KEY=/tmp/account.key
DOMAIN_CSR=/tmp/domain.csr
CHALLENGES_DIR=/data/static/challenges

openssl genrsa 4096 > $ACCOUNT_KEY
openssl genrsa 4096 > $DOMAIN_KEY
openssl req -new -sha256 -key $DOMAIN_KEY -subj "/CN=$DOMAIN" > $DOMAIN_CSR
mkdir -p $CHALLENGES_DIR
if python3 /acme_tiny.py --account-key $ACCOUNT_KEY \
                         --csr $DOMAIN_CSR \
                         --acme-dir $CHALLENGES_DIR > $SIGNED_CHAIN; then
  kubectl create secret generic $CERT_SECRET_NAME \
    --from-file=$SIGNED_CHAIN --dry-run -o yaml | kubectl apply -f -
  kubectl create secret generic $KEY_SECRET_NAME \
    --from-file=$DOMAIN_KEY --dry-run -o yaml | kubectl apply -f -
  if kubectl rollout restart deployment nginx; then
    echo "Starting nginx rollout!"
  fi
fi

