{{ define "tatorCron.template" }}
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
            - name: tator-online
              image: {{ .Values.dockerRegistry }}/tator_online:{{ .Values.gitRevision }}
              imagePullPolicy: "Always"
              command: {{ .command }}
              args: {{ .args }}
              resources:
                limits:
                  cpu: 500m
                  memory: 2Gi
              env:
                {{include "tatorEnv.template" . | indent 16}}
              ports:
                - containerPort: 8000
                  name: gunicorn
                - containerPort: 8001
                  name: daphne
              volumeMounts:
                {{ include "volumeMounts.template" . | indent 16 }}
{{ end }}
