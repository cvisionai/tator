FROM mdillon/postgis:11
WORKDIR /work
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential git ca-certificates postgresql-server-dev-11 && rm -rf /var/lib/apt/lists
RUN git clone --branch v0.2.7 https://github.com/pgvector/pgvector.git
WORKDIR /work/pgvector
RUN make
RUN make install
WORKDIR /
CMD ["postgres", "-N", "1000", "-S", "16MB", "-B", "4000MB"]
