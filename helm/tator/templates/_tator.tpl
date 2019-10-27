{{ define "tator.template" }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .name }}
  labels:
    app: {{ .app }}
    type: web
spec:
  selector:
    matchLabels:
      app: {{ .app }}
      type: web
  replicas: {{ .replicas }}
  template:
    metadata:
      labels:
        app: {{ .app }}
        type: web
    spec:
      terminationGracePeriodSeconds: 10
      nodeSelector:
        {{ .selector }}
      containers:
        - name: tator-online
          image: {{ .Values.dockerRegistry }}/tator_online:{{ .Values.gitRevision }}
          imagePullPolicy: "Always"
          command: {{ .command }}
          args: {{ .args }}
          envFrom:
            - secretRef:
                name: tator-secrets
          env:
            - name: POSTGRES_HOST
              value: pgbouncer-svc
            - name: MAIN_HOST
              value: {{ .Values.domain }}
            - name: LOAD_BALANCER_IP
              value: {{ .Values.loadBalancerIp }}
            - name: DOCKERHUB_USER
              value: {{ .Values.dockerRegistry }}
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name

          ports:
            - containerPort: 8000
              name: gunicorn
            - containerPort: 8001
              name: daphne
          volumeMounts:
            - mountPath: /data/static
              name: static-pv-claim
            - mountPath: /data/uploads
              name: upload-pv-claim
            - mountPath: /data/media
              name: media-pv-claim
            - mountPath: /data/raw
              name: raw-pv-claim
            - mountPath: /tator_online/main/migrations
              name: migrations-pv-claim
      initContainers:
        - name: redis
          image: redis
          imagePullPolicy: "IfNotPresent"
          command: ["redis-cli"]
          args: ["-h", "tator-redis-headless", "-p", "6379", "ping"]
      volumes:
        - name: static-pv-claim
          persistentVolumeClaim:
            claimName: static-pv-claim
        - name: upload-pv-claim
          persistentVolumeClaim:
            claimName: upload-pv-claim
        - name: media-pv-claim
          persistentVolumeClaim:
            claimName: media-pv-claim
        - name: raw-pv-claim
          persistentVolumeClaim:
            claimName: raw-pv-claim
        - name: migrations-pv-claim
          persistentVolumeClaim:
            claimName: migrations-pv-claim
{{ end }}
