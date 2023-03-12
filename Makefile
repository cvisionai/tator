#Helps to have a line like %sudo ALL=(ALL) NOPASSWD: /bin/systemctl

include .env

CONTAINERS=ui postgis redis gunicorn nginx minio

OPERATIONS=reset logs bash

IMAGES=ui-image postgis-image client-image transcode-image

GIT_VERSION=$(shell git rev-parse HEAD)

# Get python version and set yaml arguments correctly
PYTHON3_REVISION=$(shell python3 --version | grep ^Python | sed 's/^.* //g' | awk -F. '{print $$2}')
ifeq ($(shell if [ $(PYTHON3_REVISION) -ge 7 ]; then echo "7"; fi),7)
YAML_ARGS=Loader=yaml.FullLoader
else
YAML_ARGS=
endif

TATOR_PY_WHEEL_VERSION=$(shell python3 -c 'import json; a = json.load(open("scripts/packages/tator-py/config.json", "r")); print(a.get("packageVersion"))')
TATOR_PY_WHEEL_FILE=scripts/packages/tator-py/dist/tator-$(TATOR_PY_WHEEL_VERSION)-py3-none-any.whl
FAKE_DEV_VERSION=248.434.5508
TATOR_PY_DEV_WHEEL_FILE=scripts/packages/tator-py/dist/tator-$(FAKE_DEV_VERSION)-py3-none-any.whl

TATOR_JS_MODULE_FILE=ui/server/static/tator.min.js

# default to dockerhub cvisionai organization
ifeq ($(REGISTRY),None)
REGISTRY=cvisionai
endif

# Defaults to detecting what the current's node APT is, if cross-dist building:
# or http://archive.ubuntu.com/ubuntu/ is a safe value.
# Set this ENV to http://us-east-1.ec2.archive.ubuntu.com/ubuntu/ for 
# faster builds on AWS ec2
# Set this ENV to http://iad-ad-1.clouds.archive.ubuntu.com/ubuntu/ for
# faster builds on Oracle OCI 
APT_REPO_HOST ?= $(shell cat /etc/apt/sources.list | grep "focal main" | grep -v cdrom | head -n1 | awk '{print $$2}')


#############################
## Help Rule + Generic targets
#############################
.PHONY: help
help:
	@echo "Tator Online Makefile System"
	@echo  "Generic container operations: (container-action)"
	@echo "\tValid Containers:"
	@echo $(foreach  container, $(CONTAINERS), "\t\t- ${container}\n")
	@echo "\t\t- algorithm"
	@echo "\tValid Operations:"
	@echo $(foreach  operation, $(OPERATIONS), "\t\t- ${operation}\n")
	@echo "\tExample: "
	@echo "\t\tmake tator-reset"
	@echo "\nOther useful targets: "
	@echo "\t\t - collect-static : Runs collect-static on server (manage.py)."
	@echo "\t\t - migrate : Runs migrate on server (manage.py)"
	@echo "\t\t - status : Prints status of container deployment"
	@echo "\t\t - reset : Reset all pods"

	@echo "\t\t - imageQuery: Make sentinel files match docker registry"
	@echo "\t\t - imageHold: Hold sentinel files to current time"
	@echo "\t\t - imageClean: Delete sentinel files + generated dockerfiles"

# Create backup with pg_dump
backup:
	kubectl exec -it $$(kubectl get pod -l "app=postgis" -o name | head -n 1 | sed 's/pod\///') -- pg_dump -Fc -U django -d tator_online -f /backup/tator_online_$$(date +"%Y_%m_%d__%H_%M_%S")_$(GIT_VERSION).sql;

ecr_update:
	$(eval LOGIN := $(shell aws ecr get-login --no-include-email))
	$(eval KEY := $(shell echo $(LOGIN) | python3 -c 'import sys; print(sys.stdin.read().split()[5])'))
	$(LOGIN)

# Restore database from specified backup (base filename only)
# Example:
#   make restore SQL_FILE=backup_to_use.sql DB_NAME=backup_db_name
restore: check_restore
	kubectl exec -it $$(kubectl get pod -l "app=postgis" -o name | head -n 1 | sed 's/pod\///') -- createdb -U django $(DB_NAME) 
	kubectl exec -it $$(kubectl get pod -l "app=postgis" -o name | head -n 1 | sed 's/pod\///') -- pg_restore -U django -d $(DB_NAME) /backup/$(SQL_FILE)

.PHONY: check_restore
check_restore:
	@echo -n "This will create a backup database and restore. Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]

init-logs:
	kubectl logs $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -c init-tator-online

dump-logs:
	mkdir -p /tmp/logs
	kubectl logs $$(kubectl get pod -l "app=db-worker" -o name | head -n 1 | sed 's/pod\///') > /tmp/logs/db-worker-logs.txt
	kubectl logs $$(kubectl get pod -l "app=image-worker" -o name | head -n 1 | sed 's/pod\///') > /tmp/logs/image-worker-logs.txt
	kubectl logs $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') > /tmp/logs/gunicorn-logs.txt
	kubectl logs $$(kubectl get pod -l "app=nginx" -o name | head -n 1 | sed 's/pod\///') > /tmp/logs/nginx-logs.txt
	kubectl logs $$(kubectl get pod -l "app=postgis" -o name | head -n 1 | sed 's/pod\///') > /tmp/logs/postgis-logs.txt
	kubectl logs $$(kubectl get pod -l "app=ui" -o name | head -n 1 | sed 's/pod\///') > /tmp/logs/ui-logs.txt

ui_bash:
	kubectl exec -it $$(kubectl get pod -l "app=ui" -o name | head -n 1 | sed 's/pod\///') -- /bin/sh

# Top-level rule to catch user action + podname and whether it is present
# Sets pod name to the command to execute on each pod.
define generate_rule
$(1)-$(2):
	make podname=$(1) _$(2);
endef

$(foreach action,$(OPERATIONS),$(foreach container,$(CONTAINERS),$(eval $(call generate_rule,$(container),$(action)))))

# Generic handlers (variable podname is set to the requested pod)
_reset:
	GIT_VERSION=$(GIT_VERSION) docker compose restart $(podname)

_bash:
	docker exec -it $(podname) /bin/bash

_logs:
	docker compose logs $(podname)

django-shell:
	docker exec -it gunicorn python3 manage.py shell

psql-shell:
	docker exec -it postgis psql -U $(POSTGRES_USER) -d tator_online

#####################################
## Custom rules below:
#####################################
.PHONY: status
status:
	kubectl get --watch pods -o wide --sort-by="{.spec.nodeName}"

.ONESHELL:

.PHONY: check-migration
check-migration:
	scripts/check-migration.sh $(pwd)

.PHONY: compose
compose: check-migration api/main/version.py clean_schema
	docker network inspect public >/dev/null 2>&1 || \
    docker network create public
	GIT_VERSION="$(GIT_VERSION)" docker compose up -d postgis --wait
	GIT_VERSION="$(GIT_VERSION)" docker compose up -d minio --wait
	GIT_VERSION="$(GIT_VERSION)" docker compose up -d redis --wait
	GIT_VERSION="$(GIT_VERSION)" docker compose run --rm create-extensions
	GIT_VERSION="$(GIT_VERSION)" docker compose up

cluster: api/main/version.py clean_schema
	$(MAKE) images .token/tator_online_$(GIT_VERSION) cluster-deps cluster-install

cluster-deps:
	helm dependency update helm/tator

cluster-install:
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.0-beta4/aio/deploy/recommended.yaml # No helm chart for this version yet
	helm install --debug --atomic --timeout 60m0s --set gitRevision=$(GIT_VERSION) tator helm/tator

cluster-upgrade: check-migration api/main/version.py clean_schema images .token/tator_online_$(GIT_VERSION)
	helm upgrade --debug --atomic --timeout 60m0s --set gitRevision=$(GIT_VERSION) tator helm/tator

cluster-update: 
	helm upgrade --debug --atomic --timeout 60m0s --set gitRevision=$(GIT_VERSION) tator helm/tator

cluster-uninstall:
	kubectl delete apiservice v1beta1.metrics.k8s.io
	kubectl delete all --namespace kubernetes-dashboard --all
	helm uninstall tator

.PHONY: clean
clean:
	docker compose down

clean-tokens:
	rm -fr .token

dashboard-token:
	kubectl -n kube-system describe secret $$(kubectl -n kube-system get secret | grep tator-kubernetes-dashboard | awk '{print $$1}')

# GIT-based diff for image generation
# Available for tator-image, change dep to ".token/tator_online_$(GIT_VERSION)"
# Will cause a rebuild on any dirty working tree OR if the image has been built with a token generated
ifeq ($(shell git diff api | wc -l), 0)
.token/tator_online_$(GIT_VERSION):
	@echo "No git changes detected"
	make tator-image
else
.PHONY: .token/tator_online_$(GIT_VERSION)
.token/tator_online_$(GIT_VERSION):
	@echo "Git changes detected"
	$(MAKE) tator-image
endif

.PHONY: tator-image
tator-image:
	DOCKER_BUILDKIT=1 docker build --build-arg GIT_VERSION=$(GIT_VERSION) --build-arg APT_REPO_HOST=$(APT_REPO_HOST) --network host -t $(REGISTRY)/tator_online:$(GIT_VERSION) -f containers/tator/Dockerfile . || exit 255
	docker push $(REGISTRY)/tator_online:$(GIT_VERSION)
	mkdir -p .token
	touch .token/tator_online_$(GIT_VERSION)

.PHONY: ui-image
ui-image: webpack
	DOCKER_BUILDKIT=1 docker build --build-arg GIT_VERSION=$(GIT_VERSION) --network host -t $(REGISTRY)/tator_ui:$(GIT_VERSION) -f containers/tator_ui/Dockerfile . || exit 255
	docker push $(REGISTRY)/tator_ui:$(GIT_VERSION)

.PHONY: postgis-image
postgis-image:
	DOCKER_BUILDKIT=1 docker build --network host -t $(REGISTRY)/tator_postgis:$(GIT_VERSION) --build-arg APT_REPO_HOST=$(APT_REPO_HOST) -f containers/postgis/Dockerfile . || exit 255
	docker push $(REGISTRY)/tator_postgis:$(GIT_VERSION)

EXPERIMENTAL_DOCKER=$(shell docker version --format '{{json .Client.Experimental}}')
ifeq ($(EXPERIMENTAL_DOCKER), true)
# exists if experimental docker is not found
.PHONY: experimental_docker
experimental_docker:
	@echo "NOTICE:\tDetected experimental docker"
else
.PHONY: experimental_docker
experimental_docker:
	@echo  "ERROR:\tImage build requires '--platform' argument which requires docker client experimental features"
	@echo "\tUpgrade to docker client version >= 20.10.17 or turn on the experimental flag manually in config.json"
	@echo "\tFor more info, see 'man docker-config-json'"
	exit 255
endif


ifeq ($(USE_VPL),true)
.PHONY: client-vpl
client-vpl: $(TATOR_PY_WHEEL_FILE)
	DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --network host -t $(REGISTRY)/tator_client_vpl:$(GIT_VERSION) -f containers/tator_client/Dockerfile.vpl . || exit 255
	docker push $(REGISTRY)/tator_client_vpl:$(GIT_VERSION)
else
.PHONY: client-vpl
client-vpl: $(TATOR_PY_WHEEL_FILE)
	@echo "Skipping VPL Build"
endif

.PHONY: client-amd64
client-amd64: $(TATOR_PY_WHEEL_FILE)
	DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --network host -t $(REGISTRY)/tator_client_amd64:$(GIT_VERSION) --build-arg APT_REPO_HOST=$(APT_REPO_HOST)  -f containers/tator_client/Dockerfile . || exit 255

.PHONY: client-aarch64
client-aarch64: $(TATOR_PY_WHEEL_FILE)
		DOCKER_BUILDKIT=1 docker build --platform linux/aarch64 --network host -t $(REGISTRY)/tator_client_aarch64:$(GIT_VERSION) -f containers/tator_client/Dockerfile_arm . || exit 255

# Publish client image to dockerhub so it can be used cross-cluster
.PHONY: client-image
client-image: experimental_docker client-vpl client-amd64 client-aarch64
	docker push $(REGISTRY)/tator_client_amd64:$(GIT_VERSION)
	docker push $(REGISTRY)/tator_client_aarch64:$(GIT_VERSION)
	docker manifest create --insecure $(REGISTRY)/tator_client:$(GIT_VERSION) --amend $(REGISTRY)/tator_client_amd64:$(GIT_VERSION) --amend $(REGISTRY)/tator_client_aarch64:$(GIT_VERSION) 
	docker manifest create --insecure $(REGISTRY)/tator_client:latest --amend $(REGISTRY)/tator_client_amd64:$(GIT_VERSION) --amend $(REGISTRY)/tator_client_aarch64:$(GIT_VERSION) 
	docker manifest push $(REGISTRY)/tator_client:$(GIT_VERSION)
	docker manifest push $(REGISTRY)/tator_client:latest

.PHONY: client-latest
client-latest: client-image
	docker tag $(REGISTRY)/tator_client:$(GIT_VERSION) cvisionai/tator_client:latest
	docker push cvisionai/tator_client:latest

.PHONY: braw-image
braw-image:
	DOCKER_BUILDKIT=1 docker build --network host -t $(REGISTRY)/tator_client_braw:$(GIT_VERSION) -f containers/tator_client_braw/Dockerfile . || exit 255
	docker push $(REGISTRY)/tator_client_braw:$(GIT_VERSION)
	docker tag $(REGISTRY)/tator_client_braw:$(GIT_VERSION) $(REGISTRY)/tator_client_braw:latest
	docker push $(REGISTRY)/tator_client_braw:latest

.PHONY: transcode-image
transcode-image:
	DOCKER_BUILDKIT=1 docker build --network host -t $(REGISTRY)/tator_transcode:$(GIT_VERSION) -f containers/tator_transcode/Dockerfile containers/tator_transcode || exit 255
	docker push $(REGISTRY)/tator_transcode:$(GIT_VERSION)


ifeq ($(shell cat api/main/version.py), $(shell ./scripts/version.sh))
.PHONY: api/main/version.py
api/main/version.py:
	@echo "Version file already generated"
else
.PHONY: api/main/version.py
api/main/version.py:
	./scripts/version.sh > api/main/version.py
	chmod +x api/main/version.py
endif

collect-static: webpack
	@scripts/collect-static.sh

dev-push:
	@scripts/dev-push.sh

ifeq ($(USE_MIN_JS),true)
webpack: $(TATOR_JS_MODULE_FILE)
	@echo "Building webpack bundles for production, because USE_MIN_JS is true"
	cd ui && npm install && python3 make_index_files.py && npm run build
else
webpack: $(TATOR_JS_MODULE_FILE)
	@echo "Building webpack bundles for development, because USE_MIN_JS is false"
	cd ui && npm install && python3 make_index_files.py && npm run buildDev
endif

.PHONY: migrate
migrate:
	GIT_VERSION=$(GIT_VERSION) docker compose up -d create-extensions
	GIT_VERSION=$(GIT_VERSION) docker compose up -d migrate

.PHONY: testinit
testinit:
	kubectl exec -it $$(kubectl get pod -l "app=postgis" -o name | head -n 1 | sed 's/pod\///') -- psql -U django -d tator_online -c 'CREATE DATABASE test_tator_online';
	kubectl exec -it $$(kubectl get pod -l "app=postgis" -o name | head -n 1 | sed 's/pod\///') -- psql -U django -d test_tator_online -c 'CREATE EXTENSION IF NOT EXISTS LTREE';
	kubectl exec -it $$(kubectl get pod -l "app=postgis" -o name | head -n 1 | sed 's/pod\///') -- psql -U django -d test_tator_online -c 'CREATE EXTENSION IF NOT EXISTS POSTGIS';
	kubectl exec -it $$(kubectl get pod -l "app=postgis" -o name | head -n 1 | sed 's/pod\///') -- psql -U django -d test_tator_online -c 'CREATE EXTENSION IF NOT EXISTS vector';
	kubectl exec -it $$(kubectl get pod -l "app=postgis" -o name | head -n 1 | sed 's/pod\///') -- psql -U django -d test_tator_online -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
	
.PHONY: test
test:
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- sh -c 'bash scripts/addExtensionsToInit.sh'
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- sh -c 'pytest --ds=tator_online.settings -n 4 --reuse-db --create-db main/tests.py'

.PHONY: cache_clear
cache-clear:
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- python3 -c 'from main.cache import TatorCache;TatorCache().invalidate_all()'

.PHONY: cleanup-evicted
cleanup-evicted:
	kubectl get pods | grep Evicted | awk '{print $$1}' | xargs kubectl delete pod

.PHONY: images
images: ${IMAGES}
	@echo "Built ${IMAGES}"

lazyPush:
	rsync -a -e ssh --exclude api/main/migrations --exclude api/main/__pycache__ main adamant:/home/brian/working/tator_online

$(TATOR_PY_WHEEL_FILE): doc/_build/schema.yaml
	cp doc/_build/schema.yaml scripts/packages/tator-py/.
	cd scripts/packages/tator-py
	rm -rf dist
	python3 setup.py sdist bdist_wheel
	if [ ! -f dist/*.whl ]; then
		exit 1
	fi
	cd ../../..

$(TATOR_PY_DEV_WHEEL_FILE): doc/_build/schema.yaml scripts/packages/tator-py/config.json
	cp doc/_build/schema.yaml scripts/packages/tator-py/.
	cd scripts/packages/tator-py
	rm -rf dist
	python3 setup.py sdist bdist_wheel
	if [ ! -f dist/*.whl ]; then
		exit 1
	fi
	cd ../../..

# OBE with partial rebuilds working, here for backwards compatibility.
.PHONY: python-bindings-only
python-bindings-only:
	$(MAKE) python-bindings

.PHONY: python-bindings
python-bindings:
	make $(TATOR_PY_WHEEL_FILE)

.PHONY: install-dev-python
install-dev-python:
	cp scripts/packages/tator-py/config.json scripts/packages/tator-py/.config.json
	sed -i "s/DEVELOPMENT_VERSION/${FAKE_DEV_VERSION}/g" scripts/packages/tator-py/config.json
	$(MAKE) $(TATOR_PY_DEV_WHEEL_FILE)
	mv scripts/packages/tator-py/.config.json scripts/packages/tator-py/config.json

	pip3 install --force-reinstall $(TATOR_PY_DEV_WHEEL_FILE)


# This is a phony rule now because submodule will handle what to rebuild
# -u only copies schema if it is newer than what is already generated
.PHONY: $(TATOR_JS_MODULE_FILE)
$(TATOR_JS_MODULE_FILE): doc/_build/schema.yaml
	cp -u doc/_build/schema.yaml scripts/packages/tator-js/tator-openapi-schema.yaml
	cd scripts/packages/tator-js && $(MAKE) all && cd ../../..
	cp scripts/packages/tator-js/pkg/dist/tator.min.js ui/server/static/.
	cp scripts/packages/tator-js/pkg/dist/tator.js ui/server/static/.
	cp scripts/packages/tator-js/src/annotator/vid_downloader.js ui/server/static/.

.PHONY: js-bindings
js-bindings: .token/tator_online_$(GIT_VERSION)
	make $(TATOR_JS_MODULE_FILE)

.PHONY: r-docs
r-docs: doc/_build/schema.yaml
	docker inspect --type=image $(REGISTRY)/tator_online:$(GIT_VERSION) && \
	cp doc/_build/schema.yaml scripts/packages/tator-r/.
	rm -rf scripts/packages/tator-r/tmp
	mkdir -p scripts/packages/tator-r/tmp
	./scripts/packages/tator-r/codegen.py $(shell pwd)/scripts/packages/tator-r/schema.yaml
	docker run --rm \
		-v $(shell pwd)/scripts/packages/tator-r:/pwd \
		-v $(shell pwd)/scripts/packages/tator-r/tmp:/out openapitools/openapi-generator-cli:v5.0.0-beta \
		generate -c /pwd/config.json \
		-i /pwd/schema.yaml \
		-g r -o /out/tator-r-new-bindings -t /pwd/templates
	docker run --rm \
		-v $(shell pwd)/scripts/packages/tator-r/tmp:/out openapitools/openapi-generator-cli:v5.0.0-beta \
		/bin/sh -c "chown -R nobody:nogroup /out"
	rm -f scripts/packages/tator-r/R/generated_*
	rm scripts/packages/tator-r/schema.yaml
	cd $(shell pwd)/scripts/packages/tator-r/tmp/tator-r-new-bindings/R && \
		for f in $$(ls -l | awk -F':[0-9]* ' '/:/{print $$2}'); do cp -- "$$f" "../../../R/generated_$$f"; done
	docker run --rm \
		-v $(shell pwd)/scripts/packages/tator-r:/tator \
		rocker/tidyverse:latest \
		/bin/sh -c "R --slave -e \"devtools::install_deps('/tator')\"; \
		R CMD build tator; R CMD INSTALL tator_*.tar.gz; \
		R --slave -e \"install.packages('pkgdown')\"; \
		Rscript -e \"devtools::document('tator')\"; \
		Rscript -e \"pkgdown::build_site('tator')\"; \
		chown -R $(shell id -u):$(shell id -g) /tator"
	rm -rf $(shell pwd)/doc/_build/html/tator-r
	cp -r $(shell pwd)/scripts/packages/tator-r/docs $(shell pwd)/doc/_build/html/tator-r
	touch $(shell pwd)/doc/tator-r/overview.rst
	touch $(shell pwd)/doc/tator-r/reference/api.rst
	cd ../../..

TOKEN=$(shell cat token.txt)
.PHONY: pytest
pytest:
	cd scripts/packages/tator-py && pip3 install . --upgrade && pytest --full-trace --host $(MAIN_HOST) --token $(TOKEN)

.PHONY: letsencrypt
letsencrypt:
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- env DOMAIN=$(DOMAIN) env DOMAIN_KEY=$(DOMAIN_KEY) env SIGNED_CHAIN=$(SIGNED_CHAIN) env KEY_SECRET_NAME=$(KEY_SECRET_NAME) env CERT_SECRET_NAME=$(CERT_SECRET_NAME) scripts/cert/letsencrypt.sh 

.PHONY: selfsigned
selfsigned:
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- env DOMAIN=$(DOMAIN) env DOMAIN_KEY=$(DOMAIN_KEY) env SIGNED_CHAIN=$(SIGNED_CHAIN) env KEY_SECRET_NAME=$(KEY_SECRET_NAME) env CERT_SECRET_NAME=$(CERT_SECRET_NAME) scripts/cert/selfsigned.sh

.PHONY: markdown-docs
markdown-docs:
	sphinx-build -M markdown ./doc ./doc/_build
	mkdir -p ./doc/_build/tator-py
	python3 scripts/format_markdown.py ./doc/_build/markdown/tator-py/utilities.md ./doc/_build/tator-py/utilities.md
	python3 scripts/format_markdown.py ./doc/_build/markdown/tator-py/api.md ./doc/_build/tator-py/api.md
	python3 scripts/format_markdown.py ./doc/_build/markdown/tator-py/models.md ./doc/_build/tator-py/models.md
	python3 scripts/format_markdown.py ./doc/_build/markdown/tator-py/exceptions.md ./doc/_build/tator-py/exceptions.md


# Only run if schema changes
doc/_build/schema.yaml: $(shell find api/main/schema/ -name "*.py") .token/tator_online_$(GIT_VERSION)
	rm -fr doc/_build/schema.yaml
	mkdir -p doc/_build
	docker run --rm -e DJANGO_SECRET_KEY=1337 $(REGISTRY)/tator_online:$(GIT_VERSION) python3 manage.py getschema > doc/_build/schema.yaml
	sed -i "s/\^\@//g" doc/_build/schema.yaml

# Hold over
.PHONY: schema
schema:
	$(MAKE) doc/_build/schema.yaml

.PHONY: check_schema
check_schema:
	docker run --rm -e DJANGO_SECRET_KEY=1337 $(REGISTRY)/tator_online:$(GIT_VERSION) python3 manage.py getschema

.PHONY: clean_schema
clean_schema:
	rm -f doc/_build/schema.yaml

ifdef PROJECT_ID
ANNOUNCE_CMD=python3 manage.py announce --file /tmp/announce.md --project $(PROJECT_ID)
else ifdef USER_ID
ANNOUNCE_CMD=python3 manage.py announce --file /tmp/announce.md --user $(USER_ID)
else
ANNOUNCE_CMD=python3 manage.py announce --file /tmp/announce.md
endif
# Makes an announcement
# System-wide announcement:
# make announce FILE=blah.md
# Project-wide announcement:
# make announce FILE=blah.md PROJECT_ID=1
# User-specific announcement:
# make announce FILE=blah.md USER_ID=1
.PHONY: announce
announce:
	kubectl cp $(FILE) $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///'):/tmp/announce.md
	kubectl exec $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- $(ANNOUNCE_CMD) 

.PHONY: rq-info
rq-info:
	kubectl exec $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- rq info

.PHONY: rq-empty
rq-empty:
	kubectl exec $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- rq empty async_jobs
	kubectl exec $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- rq empty db_jobs

.PHONY: check-clean-db-logs
check-clean-db-logs:
	scripts/check_for_errors.sh $$(kubectl get pod -l "app=db-worker" -o name | head -n 1 | sed 's/pod\///')

