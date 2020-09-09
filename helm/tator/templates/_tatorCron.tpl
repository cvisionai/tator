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
                  memory: 1Gi
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
                - name: TRANSCODER_PVC_SIZE
                  value: {{ .Values.transcoderPvcSize | default "10Gi" | quote }}
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
                - mountPath: /data/static
                  name: main-pv-claim
                  subPath: static
                - mountPath: /data/uploads
                  name: main-pv-claim
                  subPath: upload
                - mountPath: /data/media
                  name: main-pv-claim
                  subPath: media
                - mountPath: /data/raw
                  name: main-pv-claim
                  subPath: raw
                - mountPath: /tator_online/main/migrations
                  name: main-pv-claim
                  subPath: migrations
                {{- if .Values.remoteTranscodes.enabled }}
                - mountPath: /remote_transcodes
                  name: remote-transcode-cert
                  readOnly: true
                {{- end }}
{{ end }}
