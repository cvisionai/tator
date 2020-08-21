#!/usr/bin/env bash

openssl genrsa 4096 > /tmp/account.key
openssl genrsa 4096 > /tmp/domain.key
openssl req -new -sha256 -key /tmp/domain.key -subj "/CN=$MAIN_HOST" > /tmp/domain.csr
mkdir -p /data/static/challenges
python3 /acme_tiny.py --account-key /tmp/account.key \
                      --csr /tmp/domain.csr \
                      --acme-dir /data/static/challenges > /tmp/signed_chain.crt
kubectl create secret generic tls-cert \
  --from-file=/tmp/signed_chain.crt --dry-run -o yaml | kubectl apply -f -
kubectl create secret generic tls-key \
  --from-file=/tmp/domain.key --dry-run -o yaml | kubectl apply -f -

