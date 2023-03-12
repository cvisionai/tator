{{ define "dbCron.template" }}
apiVersion: batch/v1
kind: CronJob
metadata:
  name: {{ .name }}
  labels:
    app: {{ .app }}
    type: web
spec:
  schedule: {{ .schedule }}
  concurrencyPolicy: "Forbid"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: "OnFailure"
          nodeSelector:
            {{ .selector }}
          terminationGracePeriodSeconds: 10
          volumes:
            {{ include "volumes.template" . | indent 12 }}
          containers:
            - name: postgis
              image: postgres:14.7
              imagePullPolicy: "Always"
              command: {{ .command }}
              args: {{ .args }}
              env:
                - name: POSTGRES_HOST
                  value: {{ .Values.postgresHost }}
                - name: POSTGRES_USER
                  value: {{ .Values.postgresUsername }}
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: tator-secrets
                      key: postgresPassword
                - name: GIT_VERSION
                  value: {{ .Values.gitRevision }}
              volumeMounts:
                - mountPath: /backup
                  name: main-pv-claim
                  subPath: backup
          volumes:
            - name: main-pv-claim
              persistentVolumeClaim:
                claimName: main-pv-claim
{{ end }}
