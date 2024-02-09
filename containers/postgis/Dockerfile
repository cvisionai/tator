FROM postgis/postgis:14-3.3

ARG APT_REPO_HOST=http://archive.ubuntu.com/ubuntu/
ENV APT_REPO_HOST=${APT_REPO_HOST}
RUN sed -i "s;http://archive.ubuntu.com/ubuntu/;${APT_REPO_HOST};" /etc/apt/sources.list

WORKDIR /work
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential git ca-certificates postgresql-server-dev-14 cron clang-11 llvm-11 && rm -rf /var/lib/apt/lists
RUN git clone --branch v0.4.4 https://github.com/pgvector/pgvector.git
WORKDIR /work/pgvector
RUN make
RUN make install
WORKDIR /

COPY containers/postgis/postgresql.conf /etc/postgresql/postgresql.conf
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
