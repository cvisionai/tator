{{ define "prejob.template" }}
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
            - name: POSTGRES_HOST
              value: {{ .Values.postgresHost }}
            - name: POSTGRES_USERNAME
              value: {{ .Values.postgresUsername }}
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
            - name: DOCKER_REGISTRY
              value: {{ .Values.dockerRegistry }}
            - name: SYSTEM_IMAGES_REGISTRY
              value: {{ .Values.systemImageRepo | default "cvisionai" | quote }}
            - name: TATOR_DEBUG
              value: {{ .Values.tatorDebug | default "false" | quote }}
            - name: TATOR_USE_MIN_JS
              value: {{ .Values.useMinJs | default "true" | quote }}
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
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          ports:
            - containerPort: 8000
              name: gunicorn
{{ end }}
