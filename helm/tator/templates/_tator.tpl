{{ define "tator.template" }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .name }}
  labels:
    app: {{ .app }}
    type: web
spec:
  selector:
    matchLabels:
      app: {{ .app }}
      type: web
  replicas: {{ .replicas }}
  template:
    metadata:
      labels:
        app: {{ .app }}
        type: web
    spec:
      terminationGracePeriodSeconds: 60
      nodeSelector:
        {{ .selector }}
      containers:
        - name: tator-online
          image: {{ .Values.dockerRegistry }}/tator_online:{{ .Values.gitRevision }}
          imagePullPolicy: "Always"
          command: {{ .command }}
          args: {{ .args }}
          resources:
            limits:
              cpu: 8000m
            requests:
              cpu: 1000m
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
            - name: TRANSCODER_PVC_SIZE
              value: {{ .Values.transcoderPvcSize | default "10Gi" | quote }}
            - name: TRANSCODER_CPU_LIMIT
              value: {{ .Values.transcoderCpuLimit | default "4000m" | quote }}
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
              name: static-pv-claim
            - mountPath: /data/uploads
              name: upload-pv-claim
            - mountPath: /data/media
              name: media-pv-claim
            - mountPath: /data/raw
              name: raw-pv-claim
            - mountPath: /tator_online/main/migrations
              name: migrations-pv-claim
            {{- if .Values.remoteTranscodes.enabled }}
            - mountPath: /remote_transcodes
              name: remote-transcode-cert
              readOnly: true
            {{- end }}
      initContainers:
        - name: redis
          image: redis
          imagePullPolicy: "IfNotPresent"
          command: ["redis-cli"]
          args: ["-h", {{ .Values.redisHost | quote }}, "-p", "6379", "ping"]
      volumes:
        - name: static-pv-claim
          persistentVolumeClaim:
            claimName: static-pv-claim
        - name: upload-pv-claim
          persistentVolumeClaim:
            claimName: upload-pv-claim
        - name: media-pv-claim
          persistentVolumeClaim:
            claimName: media-pv-claim
        - name: raw-pv-claim
          persistentVolumeClaim:
            claimName: raw-pv-claim
        - name: migrations-pv-claim
          persistentVolumeClaim:
            claimName: migrations-pv-claim
        {{- if .Values.remoteTranscodes.enabled }}
        - name: remote-transcode-cert
          secret:
            secretName: tator-secrets
            items:
            - key: remoteTranscodeCert
              path: ca.crt
        {{- end }}
{{ end }}
