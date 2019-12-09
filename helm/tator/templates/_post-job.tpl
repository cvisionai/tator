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
{{ end }}
