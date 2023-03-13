#!/bin/bash

for name in "gunicorn" "transcode" "gunicorn-cron" "db-worker" "image-worker"; do
    echo "Updating ${name}"
    docker cp api/main ${name}:/tator_online
    docker cp api/tator_online ${name}:/tator_online
done

# Run collect static on one of them
docker exec -it gunicorn python3 manage.py collectstatic --noinput
