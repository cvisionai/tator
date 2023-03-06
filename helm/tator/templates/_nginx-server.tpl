{{ define "cors.template" }}
{{- if hasKey .Values "cors" }}
{{- if $.Values.cors.enabled }}
proxy_hide_header Access-Control-Allow-Origin;
add_header Access-Control-Allow-Origin {{ .Values.cors.origin }} always;
add_header Access-Control-Allow-Methods {{ .Values.cors.methods }} always;
add_header Access-Control-Allow-Headers "Authorization,Content-Type,X-CSRFToken" always;
add_header Access-Control-Allow-Credentials true always;
if ($request_method = OPTIONS)
{
  add_header Content-Length 0;
  add_header Content-Type text/plain;
  add_header Access-Control-Allow-Origin {{ .Values.cors.origin }} always;
  add_header Access-Control-Allow-Methods {{ .Values.cors.methods }} always;
  add_header Access-Control-Allow-Headers "Authorization,Content-Type,X-CSRFToken" always;
  add_header Access-Control-Allow-Credentials true always;
  return 200;
}
{{- end }}
{{- end }}
{{ end }}

{{ define "nginxserver.template" }}
{{- $corsSettings := dict "Values" .Values }}
{{- if .Values.requireHttps }}
server {
  listen 80;
  server_name {{ .domain }};
  ssl_certificate /ssl/{{ .tlsCertFile | default "signed_chain.crt" }};
  ssl_certificate_key /ssl/{{ .tlsKeyFile | default "domain.key" }};

  # Proxy acme challenge files.
  location /.well-known/acme-challenge/ {
    alias /static/challenges/;
    try_files $uri =404;
  }

  location / {
    return 301 https://{{ .domain }}$request_uri;
  }
}
{{- end }}

server {
  {{- if .Values.requireHttps }}
  listen 443 ssl http2;
  {{- else }}
  listen 80;
  {{- end }}

  server_name {{ .domain }};

  {{- if .Values.requireHttps }}
  ssl_certificate /ssl/{{ .tlsCertFile | default "signed_chain.crt" }};
  ssl_certificate_key /ssl/{{ .tlsKeyFile | default "domain.key" }};
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  {{- end }}
  
  access_log /var/log/nginx/access.log;
  error_log /var/log/nginx/error.log;

  location ~*phpinfo.php {
    return 404;
  }
  location ~*index.php {
    return 404;
  }
  location ~*elrekt.php {
    return 404;
  }
  location ~*config.php {
    return 404;
  }
  location ~*wp-login.php {
    return 404;
  }
  location ~*phpmyadmin {
    return 404;
  }
  location ~*recordings/theme/main.css {
    return 404;
  }
  location ~*HNAP1 {
    return 404;
  }
  location /favicon.ico {
    alias /static/images/favicon.ico;
    add_header Cache-Control "max-age=3600, must-revalidate";
  }
  location /static {
    alias /static/;
    autoindex off;
    {{- if .Values.useMinJs }}
    add_header Cache-Control "max-age=300, must-revalidate";
    {{- else }}
    add_header Cache-Control "max-age=0, must-revalidate";
    {{- end }}
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
    {{include "cors.template" $corsSettings | indent 4}}
  }
  location /docs {
    return 301 https://tator.io/docs;
  }
  location /media {
    alias /media/;
    autoindex off;
    add_header Cache-Control "max-age=3600, must-revalidate";
    add_header 'Access-Control-Allow-Headers' 'Authorization,X-CSRFToken' always;
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
    {{include "cors.template" $corsSettings | indent 4}}
    auth_request /auth-project;
  }
  location /media/working
  {
    return 403;
  }
  location /auth-project {
    internal;
    # Allow for long responses.
    proxy_connect_timeout 1200;
    proxy_send_timeout 1200;
    proxy_read_timeout 1200;
    send_timeout 1200;

    proxy_pass http://gunicorn-svc:8000/auth-project;
    proxy_pass_request_body off;
    proxy_set_header Host $host;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URI $request_uri;
    proxy_pass_header Authorization;

    proxy_http_version 1.1;
  }
  {{- if .Values.minio.enabled }}
  location /objects/ {
    proxy_pass http://tator-minio:9000/;
    {{include "cors.template" $corsSettings | indent 4}}
  }
  location /minio {
    auth_request /auth-admin;
    proxy_pass http://tator-minio:9000;
    proxy_redirect off;
    proxy_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header Connection "Keep-Alive";
    proxy_set_header Proxy-Connection "Keep-Alive";
  }
  {{- end }}
  location /argo/ {
    auth_request /auth-admin;
    proxy_pass http://argo-server.argo.svc.cluster.local:2746/;
    proxy_redirect off;
    proxy_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header Connection "Keep-Alive";
    proxy_set_header Proxy-Connection "Keep-Alive";
  }
  {{- if .Values.kibana.enabled }}
  location /logs/ {
    auth_request /auth-admin;
    proxy_pass http://tator-kibana:{{ .Values.kibana.httpPort }}/;
    proxy_redirect off;
    proxy_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header Connection "Keep-Alive";
    proxy_set_header Proxy-Connection "Keep-Alive";
  }
  {{- end }}
  location /auth-admin {
    internal;
    proxy_pass http://gunicorn-svc:8000/auth-admin;
    proxy_pass_request_body off;
    proxy_set_header Host $host;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URI $request_uri;
    proxy_pass_header Authorization;
  }

  {{- if index .Values "kube-prometheus-stack" "enabled" }}
  location /grafana/ {
    auth_request /auth-admin;
    proxy_pass http://tator-grafana/;
    proxy_set_header Host $host;
  }

  location /prometheus/ {
    auth_request /auth-admin;
    proxy_pass http://tator-kube-prometheus-stac-prometheus:9090/;
    proxy_set_header Host $host;
    sub_filter_types text/html;
    sub_filter_once off;
    sub_filter '="/' '="/prometheus/';
    sub_filter 'var PATH_PREFIX = "";' 'var PATH_PREFIX = "/prometheus";';
    rewrite ^/prometheus/?$ /prometheus/graph redirect;
    rewrite ^/prometheus/(.*)$ /$1 break;
  }
  {{- end }}

	location ~ ^/$|^/rest$|^/rest/$|^/static|^/(projects|token|organizations)|^/\d+/ {
    {{- if .Values.maintenance }}
    return 503;
    {{- end }}
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
    proxy_pass http://ui-svc:3000;

    proxy_redirect off;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $server_name;
    {{- if .Values.requireHttps }}
    proxy_set_header X-Forwarded-Proto https;
    {{- end }}
    add_header Cache-Control "max-age=0, must-revalidate";
    {{include "cors.template" $corsSettings | indent 4}}

    gzip on;
    gzip_types application/json;
    gzip_min_length 1024;
  }

  location / {
    # Allow for big REST responses.
    proxy_connect_timeout 1200;
    proxy_send_timeout 1200;
    proxy_read_timeout 1200;
    send_timeout 1200;

    {{- if .Values.maintenance }}
    return 503;
    {{- end }}
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
    proxy_pass http://gunicorn-svc:8000;

    proxy_redirect off;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $server_name;
    {{- if .Values.requireHttps }}
    proxy_set_header X-Forwarded-Proto https;
    {{- end }}
    add_header Cache-Control "max-age=0, must-revalidate";
    {{include "cors.template" $corsSettings | indent 4}}

    gzip on;
    gzip_types application/json;
    gzip_min_length 1024;
  }

  error_page 503 /static/maintenance.html;
  # Allow POST on static pages
  error_page 405 =200 $uri;
}
{{ end }}
