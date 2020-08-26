#!/usr/bin/env bash

ACCOUNT_KEY=/tmp/account.key
DOMAIN_KEY=/tmp/domain.key
DOMAIN_CSR=/tmp/domain.csr
SIGNED_CHAIN=/tmp/signed_chain.crt
CHALLENGES_DIR=/data/static/challenges

openssl genrsa 4096 > $ACCOUNT_KEY
openssl genrsa 4096 > $DOMAIN_KEY
openssl req -new -sha256 -key $DOMAIN_KEY -subj "/CN=$MAIN_HOST" > $DOMAIN_CSR
mkdir -p $CHALLENGES_DIR
if python3 /acme_tiny.py --account-key $ACCOUNT_KEY \
                         --csr $DOMAIN_CSR \
                         --acme-dir $CHALLENGES_DIR > $SIGNED_CHAIN; then
  kubectl create secret generic tls-cert \
    --from-file=$SIGNED_CHAIN --dry-run -o yaml | kubectl apply -f -
  kubectl create secret generic tls-key \
    --from-file=$DOMAIN_KEY --dry-run -o yaml | kubectl apply -f -
  if kubectl rollout restart deployment nginx; then
    echo "Starting nginx rollout!"
  fi
fi

