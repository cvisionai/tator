{{ define "postjob.template" }}
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ .name }}-job"
  labels:
    app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
    app.kubernetes.io/instance: {{ .Release.Name | quote }}
    app.kubernetes.io/version: {{ .Chart.Version }}
    helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
  annotations:
    # This is what defines this resource as a hook. Without this line, the
    # job is considered part of the release.
    "helm.sh/hook": {{ .hook }}
    "helm.sh/hook-weight": "{{ .hookWeight }}"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  ttlSecondsAfterFinished: 300
  template:
    metadata:
      name: "{{ .name }}-template"
      labels:
        app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
        app.kubernetes.io/instance: {{ .Release.Name | quote }}
        app.kubernetes.io/version: {{ .Chart.Version }}
        helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
    spec:
      restartPolicy: Never
      terminationGracePeriodSeconds: 10
      nodeSelector:
        {{ .selector }}
      containers:
        - name: tator-online
          image: {{ .Values.dockerRegistry }}/tator_online:{{ .Values.gitRevision }}
          imagePullPolicy: "Always"
          command: {{ .command }}
          args: {{ .args }}
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
              value: {{ .Values.tatorDebug | default "false" | quote }}
            - name: TATOR_USE_MIN_JS
              value: {{ .Values.useMinJs | default "true" | quote }}
            - name: DOMAIN
              value: {{ .domain }}
            - name: DOMAIN_KEY
              value: /tmp/{{ .tlsKeyFile | default domain.key }}
            - name: SIGNED_CHAIN
              value: /tmp/{{ .tlsCertFile | default signed_chain.crt }}
            - name: KEY_SECRET_NAME
              value: {{ .tlsKeySecretName | default tls-key }}
            - name: CERT_SECRET_NAME
              value: {{ .tlsCertSecretName | default tls-cert }}
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
      volumes:
        - name: main-pv-claim
          persistentVolumeClaim:
            claimName: main-pv-claim
{{ end }}
