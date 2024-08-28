# Front end development guide

## Developer instructions

Prerequisites:

* Node
* GNU Make
* Python
* Python modules `requests` and `PyYAML`.
* curl
* A Tator backend running Keycloak

Generate index files and install NPM packages:

```shell
npm install
npm run build
```

Run the server:

```shell
# Replace the --backend with the Keycloak-enabled tator backend of your choice
npm run serve -- --backend=https://earlyaccess.tator.io -k --port=8080 --redirect_uri=http://localhost:8080/callback
```

You can now open your browser to http://localhost:8080. Changes made locally only require a reload in the browser to be reflected.

Autoformat your code (recommend integration with your editor):

```shell
npx prettier --write .
```

## Server requirements

For security purposes, Keycloak enabled backends are required. The server should have the following values `Clients > tator`:

* `Valid redirect URIs`: `http://localhost:8080/*`
* `Valid post logout redirect URIs`: `http://localhost:8080`
* `Web origins`: `http://localhost:8080`

