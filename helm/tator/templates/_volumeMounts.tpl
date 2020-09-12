{{- define "volumeMounts.template" }}
- mountPath: /static
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
- mountPath: /uploads
  name: main-pv-claim
  subPath: upload
{{- end }}
{{- if hasKey .Values.pv "mediaShards" }}
{{- range .Values.pv.mediaShards }}
- mountPath: /{{ .name }}
  name: {{ .name }}-pv-claim
{{- end }}
{{- end }}
- mountPath: /media
  name: main-pv-claim
  subPath: media
- mountPath: /data/raw
  name: main-pv-claim
  subPath: raw
{{- if .Values.remoteTranscodes.enabled }}
- mountPath: /remote_transcodes
  name: remote-transcode-cert
  readOnly: true
{{- end }}
{{- end }}
