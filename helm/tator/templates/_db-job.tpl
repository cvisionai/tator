{{ define "dbjob.template" }}
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
        - name: postgis
          image: {{ .Values.dockerRegistry }}/tator_postgis:latest
          imagePullPolicy: "Always"
          command: {{ .command }}
          args: {{ .args }}
          env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: tator-secrets
                  key: TATOR_SECRET_POSTGRES_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: tator-secrets
                  key: TATOR_SECRET_POSTGRES_PASSWORD
{{ end }}
