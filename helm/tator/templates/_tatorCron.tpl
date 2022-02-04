{{ define "tatorCron.template" }}
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: {{ .name }}
  labels:
    app: {{ .app }}
    type: web
spec:
  schedule: {{ .schedule }}
  concurrencyPolicy: "Forbid"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: "OnFailure"
          nodeSelector:
            {{ .selector }}
          terminationGracePeriodSeconds: 10
          volumes:
            {{ include "volumes.template" . | indent 12 }}
          containers:
            - name: tator-online
              image: {{ .Values.dockerRegistry }}/tator_online:{{ .Values.gitRevision }}
              imagePullPolicy: "Always"
              command: {{ .command }}
              args: {{ .args }}
              resources:
                limits:
                  cpu: 500m
                  memory: 2Gi
              env:
                - name: DJANGO_SECRET_KEY
                  valueFrom:
                    secretKeyRef:
                      name: tator-secrets
                      key: djangoSecretKey
                - name: POSTGRES_HOST
                  value: {{ .Values.postgresHost }}
                - name: POSTGRES_USERNAME
                  value: {{ .Values.postgresUsername }}
                - name: POSTGRES_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: tator-secrets
                      key: postgresPassword
                - name: REDIS_HOST
                  value: {{ .Values.redisHost }}
                - name: ELASTICSEARCH_HOST
                  value: {{ .Values.elasticsearchHost }}
                - name: MAIN_HOST
                  value: {{ .Values.domain }}
                {{- if hasKey .Values "aliases" }}
                {{- $alias_hosts := "" }}
                {{- range .Values.aliases }}
                {{- $alias_hosts = cat $alias_hosts "," . }}
                {{- end }}
                {{- $alias_hosts = nospace $alias_hosts }}
                {{- $alias_hosts = trimPrefix "," $alias_hosts }}
                - name: ALIAS_HOSTS
                  value: {{ $alias_hosts }}
                {{- end }}
                - name: DOCKER_USERNAME
                  value: {{ .Values.dockerUsername }}
                - name: DOCKER_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: tator-secrets
                      key: dockerPassword
                - name: DOCKER_REGISTRY
                  value: {{ .Values.dockerRegistry }}
                - name: SYSTEM_IMAGES_REGISTRY
                  value: {{ .Values.systemImageRepo | default "cvisionai" | quote }}
                {{- if .Values.minio.enabled }}
                - name: OBJECT_STORAGE_HOST
                  value: http://tator-minio:9000
                - name: OBJECT_STORAGE_EXTERNAL_HOST
                  value: {{ .Values.domain }}/objects
                - name: OBJECT_STORAGE_REGION_NAME
                  value: {{ .Values.objectStorageRegionName | default "us-east-2" | quote }}
                - name: BUCKET_NAME
                  value: {{ .Values.minio.defaultBucket.name }}
                - name: OBJECT_STORAGE_ACCESS_KEY
                  value: {{ .Values.minio.accessKey }}
                - name: OBJECT_STORAGE_SECRET_KEY
                  value: {{ .Values.minio.secretKey }}
                {{- else }}
                - name: OBJECT_STORAGE_HOST
                  value: {{ .Values.objectStorageHost }}
                - name: OBJECT_STORAGE_REGION_NAME
                  value: {{ .Values.objectStorageRegionName | default "us-east-2" | quote }}
                - name: BUCKET_NAME
                  value: {{ .Values.objectStorageBucketName }}
                - name: OBJECT_STORAGE_ACCESS_KEY
                  value: {{ .Values.objectStorageAccessKey }}
                - name: OBJECT_STORAGE_SECRET_KEY
                  value: {{ .Values.objectStorageSecretKey }}
                {{- end }}
                - name: TATOR_DEBUG
                {{- if .Values.tatorDebug }}
                  value: "true"
                {{- else }}
                  value: "false"
                {{- end }}
                - name: TATOR_USE_MIN_JS
                {{- if .Values.useMinJs }}
                  value: "true"
                {{- else }}
                  value: "false"
                {{- end }}
                - name: REQUIRE_HTTPS
                  {{- if .Values.requireHttps }}
                  value: "TRUE"
                  {{- else }}
                  value: "FALSE"
                  {{- end }}
                - name: DOMAIN
                  value: {{ .domain }}
                - name: DOMAIN_KEY
                  value: /tmp/{{ .tlsKeyFile | default "domain.key" }}
                - name: SIGNED_CHAIN
                  value: /tmp/{{ .tlsCertFile | default "signed_chain.crt" }}
                - name: KEY_SECRET_NAME
                  value: {{ .tlsKeySecretName | default "tls-key" }}
                - name: CERT_SECRET_NAME
                  value: {{ .tlsCertSecretName | default "tls-cert" }}
                - name: WORKFLOW_STORAGE_CLASS
                  value: {{ .Values.workflowStorageClass | default "nfs-client" | quote }}
                {{- if hasKey .Values "slackToken" }}
                - name: TATOR_SLACK_TOKEN
                  valueFrom:
                    secretKeyRef:
                      name: tator-secrets
                      key: slackToken
                - name: TATOR_SLACK_CHANNEL
                  valueFrom:
                    secretKeyRef:
                      name: tator-secrets
                      key: slackChannel
                {{- end }}
                {{- if .Values.email.enabled }}
                - name: TATOR_EMAIL_ENABLED
                  value: "true"
                - name: TATOR_EMAIL_SENDER
                  value: {{ .Values.email.sender }}
                - name: TATOR_EMAIL_AWS_REGION
                  value: {{ .Values.email.aws_region }}
                - name: TATOR_EMAIL_AWS_ACCESS_KEY_ID
                  value: {{ .Values.email.aws_access_key_id }}
                - name: TATOR_EMAIL_AWS_SECRET_ACCESS_KEY
                  value: {{ .Values.email.aws_secret_access_key }}
                {{- end }}
                {{- if .Values.remoteTranscodes.enabled }}
                - name: REMOTE_TRANSCODE_HOST
                  value: {{ .Values.remoteTranscodes.host }}
                - name: REMOTE_TRANSCODE_PORT
                  value: {{ .Values.remoteTranscodes.port | quote }}
                - name: REMOTE_TRANSCODE_TOKEN
                  valueFrom:
                    secretKeyRef:
                      name: tator-secrets
                      key: remoteTranscodeToken
                - name: REMOTE_TRANSCODE_CERT
                  value: /remote_transcodes/ca.crt
                {{- end }}
                - name: POD_NAME
                  valueFrom:
                    fieldRef:
                      fieldPath: metadata.name
              ports:
                - containerPort: 8000
                  name: gunicorn
                - containerPort: 8001
                  name: daphne
              volumeMounts:
                {{ include "volumeMounts.template" . | indent 16 }}
{{ end }}
