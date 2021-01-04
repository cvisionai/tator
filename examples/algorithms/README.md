# Registering a new algorithm

Tator uses [Argo](https://github.com/argoproj/argo) to define custom algorithm workflows. Examples of workflow specs can be found [here](https://github.com/argoproj/argo/blob/master/examples/README.md). To register a new algorithm, an `Algorithm` object must be defined via the Tator admin console. These contain the following fields:

* **Name**: Name of the algorithm as it should appear in the web interface.
* **Project**: Foreign key to project.
* **User**: Foreign key to user registering the algorithm.
* **Description**: Optional description.
* **Manifest**: Argo workflow manifest file.
* **Cluster**: Optional foreign key to `JobCluster` object. If given, workflows will be submitted to this JobCluster.
* **Files per job**: How many media files should be submitted to each workflow.

## Workflow parameters

When a workflow is submitted via the REST API (specifically the `AlgorithmLaunch` endpoint), the media specified via the query parameters is divided into batches according to the algorithm's **Files per job** definition. The media IDs, as well as the sections for the media, are included in the workflow manifest as parameters, along with some other parameters that your workflow manifest may use via `{{workflow.parameters.parameter_name}}`. The full list of parameters set by Tator include:

* `media_ids`: A comma-separated list of media IDs.
* `sections`: A comma-separated list of media sections.
* `gid`: A group ID for making progress updates.
* `uid`: A run ID for making progress updates.
* `host`: Host of the REST API used to launch this algorithm.
* `rest_url`: URL for the REST API used to launch this algorithm.
* `rest_token`: User token that must be included in headers of requests made to REST API.
* `project_id`: The project ID for the algorithm.

## Exit handler

If the manifest for an algorithm does not include a `onExit` definition in its spec, an exit handler will be added by tator. The exit handler simply submits a progress update to the REST API indicating whether the algorithm succeeded or failed.

## Labels and annotations

The following labels are added to the manifest for job management purposes:

* `job_type`: Always set to 'algorithm' for custom algorithms.
* `project`: The project ID.
* `gid`: The group ID for making progress updates.
* `uid`: The run ID for making progress updates.
* `user`: The numerical user ID for the job submitter.

The following annotations are added to the manifest for informational purposes:

* `name`: The name of the algorithm that was launched.
* `sections`: Comma-separated list of media sections for each media.
* `media_ids`: Comma-separated list of media IDs for each media.

## Testing the manifest before registration

Workflows can be executed outside of Tator if the workflow parameters are defined on the command line. Only the parameters used by the workflow must be defined. For example, the `gpu_test` example in this directory can be run using:

```
kubectl apply -f gpu_test/workflow.yaml
```
