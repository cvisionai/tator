{{- define "volumeMounts.template" }}
- mountPath: /static
{{ if .Values.staticPv.enabled }}
  name: static-pv-claim
{{ else }}
  name: main-pv-claim
{{ end }}
  subPath: static
- mountPath: /tator_online/main/migrations
  name: main-pv-claim
  subPath: migrations
- mountPath: /media
  name: main-pv-claim
  subPath: media
- mountPath: /backup
  name: main-pv-claim
  subPath: backup
{{- if .Values.remoteTranscodes.enabled }}
- mountPath: /remote_transcodes
  name: remote-transcode-cert
  readOnly: true
{{- end }}
{{- end }}
