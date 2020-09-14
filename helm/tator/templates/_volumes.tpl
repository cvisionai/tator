{{- define "volumes.template" }}
{{- if hasKey .Values.pv "uploadShards" }}
{{- range .Values.pv.uploadShards }}
- name: {{ .name }}-pv-claim
  persistentVolumeClaim:
    claimName: {{ .name }}-pv-claim
{{- end }}
{{- end }}
{{- if hasKey .Values.pv "mediaShards" }}
{{- range .Values.pv.mediaShards }}
- name: {{ .name }}-pv-claim
  persistentVolumeClaim:
    claimName: {{ .name }}-pv-claim
{{- end }}
{{- end }}
- name: main-pv-claim
  persistentVolumeClaim:
    claimName: main-pv-claim
{{- if .Values.remoteTranscodes.enabled }}
- name: remote-transcode-cert
  secret:
    secretName: tator-secrets
    items:
    - key: remoteTranscodeCert
      path: ca.crt
{{- end }}
{{- end }}
