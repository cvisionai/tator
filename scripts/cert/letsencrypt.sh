#!/usr/bin/env bash

# The following may be supplied:
#   DOMAIN - domain name (defaults to cloud.tator.io)
#   DOMAIN_KEY - path to domain key file (defaults to /tmp/domain.key)
#   SIGNED_CHAIN - path to signed certficate file (defaults to /tmp/signed_chain.crt)
#   CERT_SECRET_NAME - name of kubernetes secret containing signed certificate (defaults to tls-cert)
#   KEY_SECRET_NAME - name of kubernetes secret containing key (defaults to tls-key)
#
# Example:
#   DOMAIN=mysite.duckdns.org \
#   DOMAIN_KEY=/tmp/domain.key \
#   SIGNED_CHAIN=/tmp/signed_chain.crt \
#   CERT_SECRET_NAME=tls-cert \
#   KEY_SECRET_NAME=tls-key \
#   ./letsencrypt.sh

if [ -z $DOMAIN ]; then
  echo "DOMAIN not supplied, will be set to default cloud.tator.io!"
  DOMAIN=cloud.tator.io
else
  echo "DOMAIN is set to '$DOMAIN'"
fi

if [ -z $DOMAIN_KEY ]; then
  echo "DOMAIN_KEY not supplied, will be set to default /tmp/domain.key!"
  DOMAIN_KEY=/tmp/domain.key
else
  echo "DOMAIN_KEY is set to '$DOMAIN_KEY'"
fi

if [ -z $SIGNED_CHAIN ]; then
  echo "SIGNED_CHAIN not supplied, will be set to default /tmp/signed_chain.key!"
  SIGNED_CHAIN=/tmp/signed_chain.key
else
  echo "SIGNED_CHAIN is set to '$SIGNED_CHAIN'"
fi

if [ -z $CERT_SECRET_NAME ]; then
  echo "CERT_SECRET_NAME not supplied, will be set to default tls-cert!"
  CERT_SECRET_NAME=tls-cert
else
  echo "CERT_SECRET_NAME is set to '$CERT_SECRET_NAME'"
fi

if [ -z $KEY_SECRET_NAME ]; then
  echo "KEY_SECRET_NAME not supplied, will be set to default tls-key!"
  KEY_SECRET_NAME=tls-key
else
  echo "KEY_SECRET_NAME is set to '$KEY_SECRET_NAME'"
fi

ACCOUNT_KEY=/tmp/account.key
DOMAIN_CSR=/tmp/domain.csr
CHALLENGES_DIR=/static/challenges

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

