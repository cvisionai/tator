{{- define "tatorEnv.template" }}
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
{{- $alias_hosts = cat $alias_hosts "," .domain }}
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
{{- if hasKey .Values "uploadBucket" }}
{{- if .Values.uploadBucket.enabled }}
- name: UPLOAD_STORAGE_HOST
  value: {{ .Values.uploadBucket.host }}
- name: UPLOAD_STORAGE_BUCKET_NAME
  value: {{ .Values.uploadBucket.name }}
- name: UPLOAD_STORAGE_REGION_NAME
  value: {{ .Values.uploadBucket.region }}
- name: UPLOAD_STORAGE_ACCESS_KEY
  value: {{ .Values.uploadBucket.accessKey }}
- name: UPLOAD_STORAGE_SECRET_KEY
  value: {{ .Values.uploadBucket.secretKey }}
{{- end }}
{{- end }}
{{- if hasKey .Values "backupBucket" }}
{{- if .Values.backupBucket.enabled }}
- name: BACKUP_STORAGE_HOST
  value: {{ .Values.backupBucket.host }}
- name: BACKUP_STORAGE_BUCKET_NAME
  value: {{ .Values.backupBucket.name }}
- name: BACKUP_STORAGE_REGION_NAME
  value: {{ .Values.backupBucket.region }}
- name: BACKUP_STORAGE_ACCESS_KEY
  value: {{ .Values.backupBucket.accessKey }}
- name: BACKUP_STORAGE_SECRET_KEY
  value: {{ .Values.backupBucket.secretKey }}
{{- end }}
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
- name: TRANSCODER_MAX_RAM_DISK_SIZE
  value: {{ .Values.transcoderMaxRamDiskSize | default "8Gi" | quote }}
- name: TRANSCODER_CPU_LIMIT
  value: {{ .Values.transcoderCpuLimit | default "4000m" | quote }}
- name: TRANSCODER_MEMORY_LIMIT
  value: {{ .Values.transcoderMemoryLimit | default "8Gi" | quote }}
- name: TRANSCODER_CODEC_NODE_SELECTORS
{{- if hasKey .Values "transcoderCodecNodeSelectors" }}
{{- if .Values.transcoderCodecNodeSelectors }}
  value: "TRUE"
{{- else }}
  value: "FALSE"
{{- end }}
{{- else }}
  value: "FALSE"
{{- end }}
- name: POD_GC_STRATEGY
  value: {{ .Values.podGCStrategy | default "OnPodCompletion" | quote }}
- name: WORKFLOW_STORAGE_CLASSES
{{- if hasKey .Values "workflowStorageClasses" }}
{{- $storage_classes := "" }}
{{- range .Values.workflowStorageClasses }}
{{- $storage_classes = cat $storage_classes "," . }}
{{- end }}
{{- $storage_classes = nospace $storage_classes }}
{{- $storage_classes = trimPrefix "," $storage_classes }}
  value: {{ $storage_classes }}
{{- else }}
  value: nfs-client
{{- end }}
- name: SCRATCH_STORAGE_CLASS
  value: {{ .Values.scratchStorageClass | default "nfs-client" | quote }}
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
- name: COGNITO_ENABLED
{{- if hasKey .Values "cognito" }}
{{- if .Values.cognito.enabled }}
  value: "TRUE"
{{- else }}
  value: "FALSE"
{{- end }}
{{- else }}
  value: "FALSE"
{{- end }}
- name: OKTA_ENABLED
{{- if hasKey .Values "okta" }}
{{- if .Values.okta.enabled }}
  value: "TRUE"
- name: OKTA_OAUTH2_KEY
  value: {{ .Values.okta.oauth2_key }}
- name: OKTA_OAUTH2_SECRET
  value: {{ .Values.okta.oauth2_secret }}
- name: OKTA_OAUTH2_TOKEN_URI
  value: {{ .Values.okta.oauth2_token_uri }}
- name: OKTA_OAUTH2_ISSUER
  value: {{ .Values.okta.oauth2_issuer }}
- name: OKTA_OAUTH2_AUTH_URI
  value: {{ .Values.okta.oauth2_auth_uri }}
{{- else }}
  value: "FALSE"
{{- end }}
{{- else }}
  value: "FALSE"
{{- end }}
- name: SAML_ENABLED
{{- if hasKey .Values "saml" }}
{{- if .Values.saml.enabled }}
  value: "TRUE"
- name: SAML_METADATA_URL
  value: {{ .Values.saml.metadata_url }}
- name: SAML_SSO_URL
  value: {{ .Values.saml.sso_url }}
{{- else }}
  value: "FALSE"
{{- end }}
{{- else }}
  value: "FALSE"
{{- end }}
- name: ANONYMOUS_REGISTRATION_ENABLED
{{- if hasKey .Values "anonymousRegistration" }}
{{- if .Values.anonymousRegistration.enabled }}
  value: "TRUE"
- name: EMAIL_CONFIRMATION
{{- if .Values.anonymousRegistration.emailConfirmation }}
  value: "TRUE"
{{- else }}
  value: "FALSE"
{{- end }}
{{- else }}
  value: "FALSE"
{{- end }}
{{- else }}
  value: "FALSE"
{{- end }}
{{- if hasKey .Values "organizations" }}
{{- if .Values.organizations.autocreate }}
- name: AUTOCREATE_ORGANIZATIONS
  value: "TRUE"
{{- end }}
{{- if .Values.organizations.allowPost }}
- name: ALLOW_ORGANIZATION_POST
  value: "TRUE"
{{- end }}
{{- end }}
{{- end }}
