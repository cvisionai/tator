{{- define "volumes.template" }}
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
