{{- define "volumeMounts.template" }}
- mountPath: /static
  name: main-pv-claim
  subPath: static
- mountPath: /tator_online/main/migrations
  name: main-pv-claim
  subPath: migrations
- mountPath: /media
  name: main-pv-claim
  subPath: media
{{- if .Values.remoteTranscodes.enabled }}
- mountPath: /remote_transcodes
  name: remote-transcode-cert
  readOnly: true
{{- end }}
{{- end }}
