{{/* Persistent volume for a shard */}}
{{- define "shard.pv" }}
---
kind: PersistentVolume
apiVersion: v1
metadata:
  name: {{ .shard.name }}-pv
spec:
  capacity:
    storage: {{ .Values.pvc.size | default "10Ti" }}
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  claimRef:
    namespace: default
    name: {{ .shard.name }}-pv-claim
  mountOptions:
    {{- range .shard.nfsMountOptions }}
    - {{ . }}
    {{- end }}
  nfs:
    server: {{ .shard.nfsServer }}
    path: {{ .shard.path }}
{{- end}}

{{/* Persistent volume claim for a shard */}}
{{- define "shard.pvc" }}
---
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: {{ .shard.name }}-pv-claim
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: {{ .Values.pvc.size | default "10Ti" }}
{{- end }}
