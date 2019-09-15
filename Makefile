#Helps to have a line like %sudo ALL=(ALL) NOPASSWD: /bin/systemctl

CONTAINERS=postgis pgbouncer redis transcoder packager tusd gunicorn daphne nginx algorithm submitter pruner sizer

OPERATIONS=reset logs bash

IMAGES=tator-image marshal-image tus-image postgis-image

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
	@echo "\t\t - update-nfs : Update NFS share"
	@echo "\t\t - collect-static : Runs collect-static on server (manage.py)."
	@echo "\t\t - migrate : Runs migrate on server (manage.py)"
	@echo "\t\t - local : Rebuild images for local deployment"
	@echo "\t\t - update: local+migrate+reset"
	@echo "\t\t - status : Prints status of container deployment"
	@echo "\t\t - reset : Reset all pods"

	@echo "\t\t - imageQuery: Make sentinel files match docker registry"
	@echo "\t\t - imageHold: Hold sentinel files to current time"
	@echo "\t\t - imageClean: Delete sentinel files + generated dockerfiles"

# Check for a valid secrets file
.PHONY: valid_secrets
valid_secrets:
	@cd k8s
	@./valid_secrets.sh
	@cd ..

.PHONY: production_check
production_check:
	@./scripts/production_check.sh

# Update target (after a fetch/rebase)
update:
	@make local
	@make reset

# Global reset:
reset:
	make $(foreach container, $(CONTAINERS), $(container)-reset)
	kubectl delete jobs --all

init-logs:
	kubectl logs $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -c init-tator-online

# Top-level rule to catch user action + podname and whether it is present
# Sets pod name to the command to execute on each pod.
define generate_rule
$(1)-$(2):
	make podname=$(1) _$(2);
endef

$(foreach action,$(OPERATIONS),$(foreach container,$(CONTAINERS),$(eval $(call generate_rule,$(container),$(action)))))

# Generic handlers (variable podname is set to the requested pod)
_reset:
	kubectl delete pods -l app=$(podname)

_bash:
	kubectl exec -it $$(kubectl get pod -l "app=$(podname)" -o name | head -n 1 | sed 's/pod\///') -- /bin/bash

_logs:
	kubectl describe pod $$(kubectl get pod -l "app=$(podname)" -o name | head -n 1 | sed 's/pod\///')
	kubectl logs $$(kubectl get pod -l "app=$(podname)" -o name | head -n 1 | sed 's/pod\///')


#####################################
## Custom rules below:
#####################################
.PHONY: status
status:
	kubectl get pods -o wide --sort-by="{.spec.nodeName}"

.ONESHELL:

cluster: valid_secrets update-nfs
	$(MAKE) tator-image images config metallb cluster-rbac gunicorn daphne \
	cluster-pvc postgis pgbouncer redis transcoder packager algorithm submitter \
	pruner sizer tusd nginx

externals/build_tools/%.sh:
	@echo "Downloading submodule"
	@git submodule update --init

externals/build_tools/%.py:
	@echo "Downloading submodule"
	@git submodule update --init

# Dockerfile.gen rules
%/Dockerfile.gen: %/Dockerfile.mako
	echo $@ $<
	./externals/build_tools/makocc.py -o $@ $<

tator-image: containers/tator/Dockerfile.gen
	docker build  $(shell ./externals/build_tools/multiArch.py --buildArgs) -t $(DOCKERHUB_USER)/tator_online:latest -f $< . || exit 255
	docker push $(DOCKERHUB_USER)/tator_online:latest
	sleep 1
	touch -d "$(shell docker inspect -f '{{ .Created }}' ${DOCKERHUB_USER}/tator_online)" tator-image

PYTATOR_VERSION=$(shell cat scripts/packages/pytator/version)
.PHONY: containers/PyTator-$(PYTATOR_VERSION)-py3-none-any.whl
containers/PyTator-$(PYTATOR_VERSION)-py3-none-any.whl:
	make -C scripts/packages/pytator wheel
	cp scripts/packages/pytator/dist/PyTator-$(PYTATOR_VERSION)-py3-none-any.whl containers
marshal-image:  containers/tator_algo_marshal/Dockerfile.gen containers/PyTator-$(PYTATOR_VERSION)-py3-none-any.whl
	docker build  $(shell ./externals/build_tools/multiArch.py  --buildArgs) -t $(DOCKERHUB_USER)/tator_algo_marshal:latest -f $< containers || exit 255
	docker push $(DOCKERHUB_USER)/tator_algo_marshal:latest
	sleep 1
	touch -d "$(shell docker inspect -f '{{ .Created }}' ${DOCKERHUB_USER}/tator_algo_marshal)" marshal-image

postgis-image:  containers/postgis/Dockerfile.gen
	docker build  $(shell ./externals/build_tools/multiArch.py --buildArgs) -t $(DOCKERHUB_USER)/tator_postgis:latest -f $< containers || exit 255
	docker push $(DOCKERHUB_USER)/tator_postgis:latest
	sleep 1
	touch -d "$(shell docker inspect -f '{{ .Created }}' ${DOCKERHUB_USER}/tator_postgis)" postgis-image

tus-image: containers/tus/Dockerfile.gen
	docker build  $(shell ./externals/build_tools/multiArch.py  --buildArgs) -t $(DOCKERHUB_USER)/tator_tusd:latest -f $< containers || exit 255
	docker push $(DOCKERHUB_USER)/tator_tusd:latest
	sleep 1
	touch -d "$(shell docker inspect -f '{{ .Created }}' ${DOCKERHUB_USER}/tator_tusd)" tus-image

config:
	kubectl apply -f k8s/tator-secrets.yaml

cluster-rbac:
	kubectl apply -f k8s/incluster-rbac.yaml

.PHONY: cross-info
cross-info: ./externals/build_tools/multiArch.py
	./externals/build_tools/multiArch.py  --help

metallb:
	kubectl apply -f https://raw.githubusercontent.com/google/metallb/v0.7.3/manifests/metallb.yaml
	envsubst < k8s/metallb-configmap.yaml | kubectl apply -f -

cluster-pvc:
	envsubst < k8s/cluster-pvc.yaml | kubectl apply -f -

postgis:
	envsubst < k8s/postgis-deployment.yaml | kubectl apply -f -
	kubectl apply -f k8s/postgis-service.yaml

pgbouncer:
	envsubst < k8s/pgbouncer-deployment.yaml | kubectl apply -f -
	kubectl apply -f k8s/pgbouncer-service.yaml

redis:
	kubectl apply -f k8s/redis-deployment.yaml
	kubectl apply -f k8s/redis-service.yaml

tusd:
	envsubst <  k8s/tusd-deployment.yaml | kubectl apply -f -
	kubectl apply -f k8s/tusd-service.yaml

transcoder:
	env TATOR_DEPLOYMENT=transcoder-deployment \
	env TATOR_APP=transcoder \
	env TATOR_COMMAND=[\"python3\"] \
	env TATOR_ARGS=[\"manage.py\",\ \"runworker\",\ \"transcoder\"] \
	env TATOR_INIT_COMMAND=[\"echo\"] \
	env TATOR_REPLICAS=2 \
	envsubst < k8s/tator-deployment.yaml | kubectl apply -f -

packager:
	env TATOR_DEPLOYMENT=packager-deployment \
	env TATOR_APP=packager \
	env TATOR_COMMAND=[\"python3\"] \
	env TATOR_ARGS=[\"manage.py\",\ \"runworker\",\ \"packager\"] \
	env TATOR_INIT_COMMAND=[\"echo\"] \
	env TATOR_REPLICAS=1 \
	envsubst < k8s/tator-deployment.yaml | kubectl apply -f -

algorithm:
	#kubectl apply -f k8s/algo-setup-networkpolicy.yaml
	#kubectl apply -f k8s/algorithm-networkpolicy.yaml
	#kubectl apply -f k8s/algo-teardown-networkpolicy.yaml
	env TATOR_DEPLOYMENT=algorithm-deployment \
	env TATOR_APP=algorithm \
	env TATOR_COMMAND=[\"python3\"] \
	env TATOR_ARGS=[\"manage.py\",\ \"runworker\",\ \"algorithm\"] \
	env TATOR_INIT_COMMAND=[\"echo\"] \
	env TATOR_REPLICAS=1 \
	envsubst < k8s/tator-deployment.yaml | kubectl apply -f -

submitter:
	env TATOR_DEPLOYMENT=submitter-deployment \
	env TATOR_APP=submitter \
	env TATOR_COMMAND=[\"python3\"] \
	env TATOR_ARGS=[\"manage.py\",\ \"submitjobs\"] \
	env TATOR_INIT_COMMAND=[\"echo\"] \
	env TATOR_REPLICAS=1 \
	envsubst < k8s/tator-deployment.yaml | kubectl apply -f -

pruner:
	env TATOR_DEPLOYMENT=pruner-deployment \
	env TATOR_APP=pruner \
	env TATOR_COMMAND=[\"python3\"] \
	env TATOR_ARGS=[\"manage.py\",\ \"prunemessages\"] \
	env TATOR_INIT_COMMAND=[\"echo\"] \
	env TATOR_REPLICAS=1 \
	envsubst < k8s/tator-deployment.yaml | kubectl apply -f -

sizer:
	env TATOR_DEPLOYMENT=sizer-deployment \
	env TATOR_APP=sizer \
	env TATOR_COMMAND=[\"python3\"] \
	env TATOR_ARGS=[\"manage.py\",\ \"updateprojects\"] \
	env TATOR_INIT_COMMAND=[\"echo\"] \
	env TATOR_REPLICAS=1 \
	envsubst < k8s/tator-deployment.yaml | kubectl apply -f -

gunicorn:
	env TATOR_DEPLOYMENT=gunicorn-deployment \
	env TATOR_APP=gunicorn \
	env TATOR_COMMAND=[\"gunicorn\"] \
	env TATOR_ARGS=[\"--workers\",\ \"4\",\"--timeout\",\ \"60\",\"--reload\",\ \"-b\",\ \":8000\",\ \"tator_online.wsgi\"] \
	env TATOR_INIT_COMMAND=[\"containers/tator/init.sh\"] \
	env TATOR_REPLICAS=1 \
	envsubst < k8s/tator-deployment.yaml | kubectl apply -f -
	kubectl apply -f k8s/gunicorn-service.yaml

daphne:
	env TATOR_DEPLOYMENT=daphne-deployment \
	env TATOR_APP=daphne \
	env TATOR_COMMAND=[\"daphne\"] \
	env TATOR_ARGS=[\"-b\",\ \"0.0.0.0\",\ \"-p\",\ \"8001\",\ \"tator_online.asgi:application\"] \
	env TATOR_INIT_COMMAND=[\"echo\"] \
	env TATOR_REPLICAS=1 \
	envsubst < k8s/tator-deployment.yaml | kubectl apply -f -
	kubectl apply -f k8s/daphne-service.yaml

tator:
	envsubst < k8s/tator-configmap.yaml | kubectl apply -f -

nginx:
	envsubst \$$TATOR_DOMAIN < k8s/nginx-configmap.yaml | kubectl apply -f -
	envsubst < k8s/nginx-service.yaml | kubectl apply -f -
	kubectl apply -f k8s/nginx-deployment.yaml

.PHONY: externals/build_tools/version.py
externals/build_tools/version.py:
	externals/build_tools/version.sh > externals_build_tools/version.py

.PHONY: main/version.py
main/version.py:
	externals/build_tools/version.sh > main/version.py
	chmod +x main/version.py

update-nfs: min-css min-js main/version.py production_check
	scripts/updateNfs.sh

collect-static: update-nfs
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') -- rm -f /data/static/js/tator/tator.min.js
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') -- rm -f /data/static/css/tator/tator.min.css
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') -- python3 manage.py collectstatic --noinput

min-css:
	node_modules/.bin/sass main/static/css/tator/styles.scss:main/static/css/tator/tator.min.css --style compressed

FILES = \
    reconnecting-websocket.min.js \
    node-uuid.js \
    util/get-cookie.js \
    util/identifying-attribute.js \
    components/tator-element.js \
    components/upload-element.js \
    components/labeled-checkbox.js \
    components/modal-close.js \
    components/modal-warning.js \
    components/modal-dialog.js \
    components/progress-job.js \
    components/progress-summary.js \
    components/header-notification.js \
    components/header-menu.js \
    components/header-user.js \
    components/header-main.js \
    components/nav-close.js \
    components/nav-back.js \
    components/nav-shortcut.js \
    components/nav-main.js \
    components/keyboard-shortcuts.js \
    components/tator-page.js \
    components/more-icon.js \
    components/form-text.js \
    components/form-file.js \
    components/chevron-right.js \
    components/text-autocomplete.js \
    projects/settings-button.js \
    projects/project-remove.js \
    projects/project-nav.js \
    projects/project-collaborators.js \
    projects/project-description.js \
    projects/project-summary.js \
    projects/new-project.js \
    projects/delete-project.js \
    projects/projects-dashboard.js \
    new-project/new-project-close.js \
    new-project/custom/custom-form.js \
    new-project/custom/custom.js \
    project-detail/new-algorithm-button.js \
    project-detail/algorithm-menu.js \
    project-detail/algorithm-button.js \
    project-detail/upload-button.js \
    project-detail/project-text.js \
    project-detail/project-search.js \
    project-detail/new-section.js \
    project-detail/section-search.js \
    project-detail/section-upload.js \
    project-detail/cancel-button.js \
    project-detail/download-button.js \
    project-detail/rename-button.js \
    project-detail/delete-button.js \
    project-detail/section-more.js \
    project-detail/media-move.js \
    project-detail/media-more.js \
    project-detail/media-description.js \
    project-detail/media-card.js \
    project-detail/section-prev.js \
    project-detail/section-next.js \
    project-detail/section-expand.js \
    project-detail/section-paginator.js \
    project-detail/section-files.js \
    project-detail/section-overview.js \
    project-detail/media-section.js \
    project-detail/delete-section-form.js \
    project-detail/delete-file-form.js \
    project-detail/new-algorithm-form.js \
    project-detail/project-detail.js \
    project-settings/project-settings.js \
    annotation/annotation-breadcrumbs.js \
    annotation/media-capture-button.js \
    annotation/media-link-button.js \
    annotation/media-prev-button.js \
    annotation/media-next-button.js \
    annotation/zoom-control.js \
    annotation/rate-control.js \
    annotation/annotation-settings.js \
    annotation/edit-button.js \
    annotation/box-button.js \
    annotation/line-button.js \
    annotation/point-button.js \
    annotation/zoom-in-button.js \
    annotation/zoom-out-button.js \
    annotation/pan-button.js \
    annotation/annotation-sidebar.js \
    annotation/rewind-button.js \
    annotation/play-button.js \
    annotation/fast-forward-button.js \
    annotation/frame-prev.js \
    annotation/frame-next.js \
    annotation/timeline-canvas.js \
    annotation/video-fullscreen.js \
    annotator/FrameBuffer.js \
    annotator/drawGL_colors.js \
    annotator/drawGL.js \
    annotator/annotation.js \
    annotator/video.js \
    annotator/image.js \
    annotation/annotation-player.js \
    annotation/annotation-image.js \
    annotation/bool-input.js \
    annotation/enum-input.js \
    annotation/text-input.js \
    annotation/attribute-panel.js \
    annotation/recents-panel.js \
    annotation/save-dialog.js \
    annotation/entity-button.js \
    annotation/media-panel.js \
    annotation/frame-panel.js \
    annotation/entity-browser.js \
    annotation/entity-prev-button.js \
    annotation/entity-next-button.js \
    annotation/entity-delete-button.js \
    annotation/entity-more.js \
    annotation/entity-selector.js \
    annotation/annotation-browser.js \
    annotation/undo-buffer.js \
    annotation/annotation-data.js \
    annotation/annotation-page.js \
    annotation/seek-bar.js \
    third_party/autocomplete.js
JSDIR = main/static/js
OUTDIR = main/static/js/tator

define generate_minjs
.min_js/${1:.js=.min.js}: $(JSDIR)/${1}
	@mkdir -p .min_js/$(shell dirname ${1})
	@echo "Building '${1:.js=.min.js}'"
	node_modules/.bin/babel-minify $(JSDIR)/${1} -o .min_js/${1:.js=.min.js}
endef
$(foreach file,$(FILES),$(eval $(call generate_minjs,$(file))))


min-js:
	if kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- python3 -c 'from tator_online.settings import DEBUG;import sys;sys.exit(1) if DEBUG else sys.exit(0)'; then 
	mkdir -p $(OUTDIR)
	rm $(OUTDIR)/tator.min.js
	mkdir -p .min_js
	@$(foreach file,$(FILES),make --no-print-directory .min_js/$(file:.js=.min.js); cat .min_js/$(file:.js=.min.js) >> $(OUTDIR)/tator.min.js;)
	fi

migrate:
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- python3 manage.py makemigrations
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- python3 manage.py migrate
	make daphne-reset
	make transcoder-reset
	make packager-reset
	make algorithm-reset
	make submitter-reset
	make pruner-reset
	make sizer-reset

test:
	kubectl exec -it $$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- python3 manage.py test --keep

mrclean:
	kubectl patch pvc media-pv-claim -p '{"metadata":{"finalizers":null}}'
	make clean_js
clean:
	kubectl delete deployment.apps --all
	kubectl delete statefulsets --all
	kubectl delete jobs --all
	kubectl delete pods --all
	kubectl delete svc --all
	kubectl delete pvc --all
	kubectl delete pv --all
	kubectl delete networkpolicy --all
	kubectl delete configmaps --all

.PHONY: clean_js
clean_js:
	rm -rf .min_js
images:
	make ${IMAGES}

imageClean:
	rm -f ${IMAGES}
	rm -f `find . -name Dockerfile.gen`

imageHold:
	touch ${IMAGES}

imageQuery:
	touch -d "$(shell docker inspect -f '{{ .Created }}' ${DOCKERHUB_USER}/tator_online)" tator-image
	touch -d "$(shell docker inspect -f '{{ .Created }}' ${DOCKERHUB_USER}/tator_algo_marshal)" marshal-image
	touch -d "$(shell docker inspect -f '{{ .Created }}' ${DOCKERHUB_USER}/tator_tusd)" tus-image
	touch -d "$(shell docker inspect -f '{{ .Created }}' ${DOCKERHUB_USER}/tator_postgis)" postgis-image

lazyPush:
	rsync -a -e ssh --exclude main/migrations --exclude main/__pycache__ main adamant:/home/brian/working/tator_online
