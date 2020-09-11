{{- define "tusdProxy.locations" }}
location /files/ {
  {{- if .Values.requireHttps }} 
  proxy_redirect https://$hostname/ https://{{ .Values.domain }}/;
  {{- else }}
  proxy_redirect http://$hostname/ http://{{ .Values.domain }}/;
  {{- end }}
  proxy_request_buffering off;
  proxy_buffering off;
  proxy_http_version 1.1;
  proxy_set_header Tus-Version 1.0.0;
  proxy_set_header Tus-Resumable 1.0.0;
  proxy_set_header X-Forwarded-Host $host;
  {{- if .Values.requireHttps }} 
  proxy_set_header X-Forwarded-Proto https;
  {{- end }}
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_pass_header Authorization;
  proxy_pass_header Upload-Uid;
  {{- if hasKey .Values.pv "uploadShards" }}
  proxy_pass http://tusd-load-balancer/files/;
  {{- else }}
  proxy_pass http://tusd-svc:1080/files/;
  {{- end }}
  add_header X-Upstream $upstream_addr always;
  auth_request /auth-upload;
}
location /auth-upload {
  internal;
  # Allow for long responses.
  proxy_connect_timeout 1200;
  proxy_send_timeout 1200;
  proxy_read_timeout 1200;
  send_timeout 1200;

  proxy_pass http://gunicorn-svc:8000/auth-upload;
  proxy_pass_request_body off;
  proxy_set_header Host $host;
  proxy_set_header Content-Length "";
  proxy_set_header X-Original-URI $request_uri;
  proxy_set_header X-Original-METHOD $request_method;
  proxy_pass_header Authorization;
  proxy_pass_header Upload-Uid;

  proxy_http_version 1.1;
}
{{- end }}

{{- define "tusdProxy.upstream" }}
# If using upload shards, define load balancer here.
{{- if hasKey .Values.pv "uploadShards" }}
upstream tusd-load-balancer {
  hash $http_upload_uid;
  {{- range .Values.pv.uploadShards }}
  server tusd-{{ .name }}-svc:1080;
  {{- end }}
}
{{- end }}
{{- end }}

