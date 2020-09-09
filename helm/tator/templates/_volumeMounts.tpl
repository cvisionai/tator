{{- define "volumeMounts.template" }}
- mountPath: /data/static
  name: main-pv-claim
  subPath: static
- mountPath: /tator_online/main/migrations
  name: main-pv-claim
  subPath: migrations
{{- if hasKey .Values.pv "uploadShards" }}
{{- range .Values.pv.uploadShards }}
- mountPath: /{{ .name }}
  name: {{ .name }}-pv-claim
{{- end }}
{{- else }}
- mountPath: /data/uploads
  name: main-pv-claim
  subPath: upload
{{- end }}
{{- if hasKey .Values.pv "mediaShards" }}
{{- range .Values.pv.mediaShards }}
- mountPath: /{{ .name }}
  name: {{ .name }}-pv-claim
{{- end }}
{{- else }}
- mountPath: /data/media
  name: main-pv-claim
  subPath: media
- mountPath: /data/raw
  name: main-pv-claim
  subPath: raw
{{- end }}
{{- if .Values.remoteTranscodes.enabled }}
- mountPath: /remote_transcodes
  name: remote-transcode-cert
  readOnly: true
{{- end }}
{{- end }}
