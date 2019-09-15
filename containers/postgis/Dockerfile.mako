<%!
  import multiArch
%>
% if multiArch.arch=="x86_64":
FROM mdillon/postgis:11
CMD ["postgres", "-N", "1000"]
% else:
FROM postgres:9.6
MAINTAINER CVision AI <info@cvisionai.com>

% if multiArch.arch!=multiArch.host:
#copy over qemu for "cross-compiled" builds
COPY containers/qemu_support/qemu-aarch64-static /usr/bin
% endif

#Originally:
#MAINTAINER Mike Dillon <mike@appropriate.io>

ENV PG_MAJOR 9.6
ENV POSTGIS_MAJOR 2.3
ENV POSTGIS_VERSION 2.3.1+dfsg-2
ENV DEBIAN_FRONTEND noninteractive
RUN echo "Etc/GMT" > /etc/timezone
RUN chmod 777 /tmp
RUN apt-get update \
      && apt-cache showpkg postgresql-$PG_MAJOR-postgis-$POSTGIS_MAJOR \
      && apt-get install -y --no-install-recommends \
           postgresql-$PG_MAJOR-postgis-$POSTGIS_MAJOR=$POSTGIS_VERSION \
           postgresql-$PG_MAJOR-postgis-$POSTGIS_MAJOR-scripts=$POSTGIS_VERSION \
           postgis=$POSTGIS_VERSION \
      && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /docker-entrypoint-initdb.d
COPY postgis/initdb-postgis.sh /docker-entrypoint-initdb.d/postgis.sh
CMD ["postgres", "-N", "1000"]
% endif
