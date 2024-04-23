# Front end development guide

## Developer instructions

Prerequisites:

* Node
* Docker
* GNU Make
* Python
* Python modules `requests` and `PyYAML`.
* curl
* A Tator backend running Keycloak

Build the client bundle:

```shell
npm install
npm run codegen
npm run buildDev # or `npm run build` for minified code
```

Run the server:

```shell
# Replace the --backend with the Keycloak-enabled tator backend of your choice
npm run serve -- --backend=https://earlyaccess.tator.io -k --port=8080 --redirect_uri=http://localhost:8080/callback
```

You can now open your browser to http://localhost:3000.

Enable hot reload:

```shell
# Run this from a separate terminal
npm run watch
```

Autoformat your code (recommend integration with your editor):

```shell
npx prettier --write .
```

## Server requirements

For security purposes, Keycloak enabled backends are required. The server should have the following values `Clients > tator`:

* `Valid redirect URIs`: `http://localhost:8080/*`
* `Valid post logout redirect URIs`: `http://localhost:8080`
* `Web origins`: `http://localhost:8080`

