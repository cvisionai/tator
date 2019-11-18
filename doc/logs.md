# Viewing logs

Although the [dashboard](dashboard.md) supplies logs for currently running pods, Tator stores logs from terminated pods using the [ELK stack](https://www.elastic.co/what-is/elk-stack). Kibana is proxied behind Nginx and is available at `<your-domain>/logs`. There is some initial setup required after initial installation:

* Navigate to `<your-domain>/logs` in the browser.
* In the bottom-left of the page, click on `Management` (gear icon).
* Click on `Index Patterns`.
* Click `Create index pattern` in the top right.
* Add a pattern called `filebeat*`.
* Now you can go to the `Discover` button in the top-left and search all available logs from Kubernetes.

Note that the `/logs` location is only available to users with admin rights.
