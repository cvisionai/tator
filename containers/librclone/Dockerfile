# Build librclone shared object
FROM golang:latest as rclone_build
ARG RCLONE_VERSION=v1.59.2
WORKDIR /go
RUN git clone https://github.com/rclone/rclone.git --single-branch --depth 1 --branch $RCLONE_VERSION

WORKDIR /go/rclone/librclone/
RUN go build --buildmode=c-shared -o librclone.so github.com/rclone/rclone/librclone
