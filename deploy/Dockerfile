FROM python:3.12-slim AS site-build
ARG TARGETARCH
ARG QUARTO_VERSION=1.8.24
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates make \
 && curl -fsSL "https://github.com/quarto-dev/quarto-cli/releases/download/v${QUARTO_VERSION}/quarto-${QUARTO_VERSION}-linux-${TARGETARCH}.deb" -o /tmp/quarto.deb \
 && apt-get install -y --no-install-recommends /tmp/quarto.deb \
 && rm -rf /var/lib/apt/lists/* /tmp/quarto.deb
WORKDIR /work
COPY . .
RUN make package

FROM nginx:1.28-alpine
COPY --from=site-build /work/_site /usr/share/nginx/html
COPY deploy/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/proxy.conf /etc/nginx/proxy.conf
HEALTHCHECK --interval=10s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
