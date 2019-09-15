<%!
  import multiArch
%>
% if multiArch.arch=="x86_64":
FROM tusproject/tusd:0.12.0
% else:
FROM golang:1.12 AS builder

# Copy in the git repo from the build context
COPY tus/tusd /go/src/github.com/tus/tusd/

% if multiArch.arch!=multiArch.host:
#copy over qemu for "cross-compiled" builds
COPY qemu_support/qemu-aarch64-static /usr/bin
% endif

# Create app directory
WORKDIR /go/src/github.com/tus/tusd
RUN go get -d -v ./... \
    && version="$(git tag -l --points-at HEAD)" \
    && commit=$(git log --format="%H" -n 1) \
    && GOOS=linux GOARCH=${multiArch.google_arch} go build \
        -ldflags="-X github.com/tus/tusd/cmd/tusd/cli.VersionName=<%text>${version}</%text> -X github.com/tus/tusd/cmd/tusd/cli.GitCommit=<%text>${commit}</%text> -X 'github.com/tus/tusd/cmd/tusd/cli.BuildDate=$(date --utc)'" \
        -o "/go/bin/tusd" ./cmd/tusd/main.go \
    && rm -r /go/src/*

# start a new stage that copies in the binary built in the previous stage
FROM ubuntu:19.04

COPY --from=builder /go/bin/tusd /usr/local/bin/tusd
RUN chmod 1777 /tmp
RUN apt-get update && apt-get install -y ca-certificates jq     && addgroup --gid 1000 tusd     && useradd --uid 1000 -g tusd --shell /bin/sh tusd && mkdir -p /srv/tusd-hooks     && mkdir -p /srv/tusd-data     && chown tusd:tusd /srv/tusd-data

WORKDIR /srv/tusd-data
EXPOSE 1080
ENTRYPOINT ["tusd"]
CMD ["--hooks-dir","/srv/tusd-hooks"]
USER tusd
% endif