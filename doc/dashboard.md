# Viewing the Kubernetes Dashboard

The Tator build system currently installs the [Kubernetes Dashboard](https://github.com/kubernetes/dashboard) and the [metrics server](https://github.com/kubernetes-sigs/metrics-server) so that administrators can monitor pod activity and resource utilization. This tool also allows for executing commands within running pods. For further usage information, refer to the documentation.

There are plans to proxy the dashboard behind nginx once an official helm chart is released for version 2.0.0, but until then follow these steps to access the dashboard:

* From the command line used to run kubectl, run `kubectl proxy`.
* In the browser, open `http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy`
* In another terminal, run the command `make dashboard-token`. This will display a token that can be copied into the login page to access the dashboard.
