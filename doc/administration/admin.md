# Administration

Once you have a [deployment](../setup_tator/cluster.html) set up, you can follow the steps below to set up your first project.

## Creating an admin account

* Start a bash shell inside the gunicorn pod with `make gunicorn-bash`.
* Create the admin account with `python3 manage.py createsuperuser`.
* Exit from the bash shell with `exit`.
* You can now log in to Tator using the provided credentials.

## Creating a project

Project creation and configuration will eventually be part of the front end and available to all users. However currently projects can only be created via the Django admin console.

* Make sure you are logged in with an admin account. If you don't have an admin account, follow the instructions [here](admin.md#Creating an admin acount).
* Open the admin console at `<your-domain>/admin`.
* Click `Projects`.
* Click `Add Project`.
* Enter the name of the project, select yourself for `Creator`, and optionally enter a `Summary`. Other fields can be left blank.
* Click `Save`.
* Now click `Memberships`.
* Click `Add Membership`.
* Select the project you just created, select yourself for `User`, and set the `Permission` to `Full Control`.

### Adding users to a project

* You can add more users to the app by creating more `User` objects.
* Users can be added to a project with additional `Membership` objects.
* You can restrict access to a project using the `Permission` field of a `Membership` object:

  * **View Only** means a user can only look at media and annotations.
  * **Can Edit** means a user can modify annotations on existing project media.
  * **Can Transfer** means a user can download and upload media in addition to editing.
  * **Can Execute** means a user can upload, download, modify, and launch algorithms.
  * **Full Control** means a user can change project settings.

  Note that only the project creator can delete a project.

## Configuring project metadata

Metadata configuration will eventually be part of the front end and available to all users with full control over a project. However currently project metadata can only be configured via the Django admin console.

### Metadata in Tator

Tator divides data into two classes: **entities** and **attributes**, both of which can be defined by a project administrator. There are three possible entity types:

* Media (video or image)
* Localization (box, line, or point)
* State (tracks or time-varying states in videos)

Entity types may have any number of associated attribute types, with the following data types available:

* Boolean
* Integer
* Float
* String
* Enumeration
* Datetime
* Geoposition

This flexibility allows Tator to support many different types of information as applied to images or video, from relatively simple image classification tasks to complex video tasks such as multi-object tracking or activity recognition.

### Defining media types

Before you can upload and view media in Tator, a project must have at least one associated media type. To define an image type, do the following:

* Go to the admin console `<your-domain>/admin`.
* Click the `+ Add` button next to `Entity type media images`.
* Select the project, specify a name for the image type, check the `Uploadable` box, and set the file format to the dashed line (null). This will allow most image formats to be uploaded.
* Click `Save`.

For videos, do the following:

* Go to the admin console `<your-domain>/admin`.
* Click the `+ Add` button next to `Entity type media videos`.
* Select the project, specify a name for the video type, check the `Uploadable` box, and set the file format to the dashed line (null). This will allow most video formats to be uploaded.
* Click `Save`.

Now you can return to the projects view `<your-domain>/projects`, click on your project, and start uploading media via either the `Upload` button or the `+ New Section` drag and drop interface. Recursive directory uploads are only possible via the drag and drop interface.

Note that currently the front-end only supports at most one image type and one video type per project.

### Defining media metadata

Media metadata consists of attributes that are applied to a file (video or image). For example, suppose we wish to do image classification. We could set up a project for this by creating a string attribute type:

* Go to the admin console `<your-domain>/admin`.
* Click the `+ Add` button next to `Attribute type strings`.
* Specify a name for the attribute (such as "Class"), select the image type that was just created for `Applies to`, select the `Project`. If you had multiple attribute types that applied to the same entity type, you could specify the order that they appear in the front end with the `Order` field.
* Click `Save`.

Now if you return to the project detail view, clicking on one of the images will display a class field that can be used to label the image. Again, strings are just one of seven possible attribute types, and you can define multiple attribute types with the same data type.

### Defining localization types and localization metadata

Before you can draw boxes/lines/points on media, you will need to define at least one localization type (`EntityTypeLocalizationBox`, `EntityTypeLocalizationLine`, or `EntityTypeLocalizationDot`, respectively). For example, suppose we wish to do object detection. We could set up a project for this by defining a box localization type, then creating a string attribute type associated with those boxes:

* Go to the admin console `<your-domain>/admin`.
* Click the `+ Add` button next to `Entity type localization boxs`.
* Select the `Project`, give the box type a name, and select the `Media` type for which these boxes can be drawn. Other settings can be left alone. If desired, set a default value.
* Click `Save`.
* Click the `+ Add` button next to `Attribute type strings`.
* Specify a name for the attribute and select the box type that was just created for `Applies to`.
* Click `Save`.

Now if you return to the project detail view and click on an image, you will see that the box tool that was previously disabled is now enabled. Click the box tool and draw a box on your image by click and dragging. A dialog will appear asking you to fill in metadata about the box.

If you need to draw multiple boxes per image with the same metadata, you can `Shift-Click` the box tool, or use the shortcut `Shift-B`. The same capability applies for line and point annotations.

Note that you can also define localization types for videos. In these cases, the boxes are drawn on individual video frames.

### Defining state types and state metadata

Suppose we have a need to track an object that persists through multiple video frames, such as a person walking through the field of view. In another case, suppose our video data has geoposition data attached to it, and we wish to include this in Tator. Time varying information such as these can be captured by defining a `EntityTypeState`:

* Go to the admin console `<your-domain>/admin`.
* Click the `+ Add` button next to `Entity type states`.
* Select the `Project`, give the state type a name, and select the `Media` type for which these states can exist. Select the association type for this state, namely `Relates to on or more media items` if the state applies to a series of files, `Relates to a specific frame in a video` if the state applies globally to video frames (such as temperature, geoposition, etc.), or `Relates to localization(s)` if the state represents a conventional track. `Interpolation should be left as `None` except for frame associated states, in which case `Latest` may be appropriate.
* Click `Save`.

Like localization and media types, state types typically need attribute types to be defined for them to be useful; this can be accomplished similarly to previous steps. Because it is often impractical to create and label states with a large amount of associated frames or localizations by hand, it is currently only possible to create states via the Tator REST API (`<your-domain>/rest`). Once a state object has been created, however, users can view and interact with state attribute values.
## Backup and Restore of a database

### Backup Process
The `make backup` command can be used to create a `*.sql` dump of the django
application. This represents all annotations and metadata on media, *but not
the media files themselves*. 

To create the backup use the `make backup` command which will create a SQL
file in the /backup volume of kubernetes. The filename uses the git hash of the
running application to make restoration easier. 

#### Cron job

TODO

### Restoration of a database

0.) Create the cluster at the revision of software matching the database git
    hash. This means the software is the same version as when the backup was
    made.
1.) Enter the postgis-bash session. `make postgis-bash`
2.) Create the database `createdb -Udjango tator_online`
3.) Navigate to backup directory `cd /backup`
4.) Use a command to restore the database: 
    `pg_restore --disable-triggers -d tator_online -Udjango file.sql`
5.) Exit the postgis-bash session
6.) Reset gunicorn pods.
7.) Update software to the latest version. 
8.) Run migrations as required. 

## Viewing the Kubernetes Dashboard

The Tator build system currently installs the [Kubernetes Dashboard](https://github.com/kubernetes/dashboard) and the [metrics server](https://github.com/kubernetes-sigs/metrics-server) so that administrators can monitor pod activity and resource utilization. This tool also allows for executing commands within running pods. For further usage information, refer to the documentation.

There are plans to proxy the dashboard behind nginx once an official helm chart is released for version 2.0.0, but until then follow these steps to access the dashboard:

* From the command line used to run kubectl, run `kubectl proxy`.
* In the browser, open `http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy`
* In another terminal, run the command `make dashboard-token`. This will display a token that can be copied into the login page to access the dashboard.
## Viewing logs

Although the [dashboard](#Viewing the Kubernetes Dashboard) supplies logs for currently running pods, Tator stores logs from terminated pods using the [ELK stack](https://www.elastic.co/what-is/elk-stack). Kibana is proxied behind Nginx and is available at `<your-domain>/logs`. There is some initial setup required after initial installation:

* Navigate to `<your-domain>/logs` in the browser.
* In the bottom-left of the page, click on `Management` (gear icon).
* Click on `Index Patterns`.
* Click `Create index pattern` in the top right.
* Add a pattern called `filebeat*`.
* Now you can go to the `Discover` button in the top-left and search all available logs from Kubernetes.

Note that the `/logs` location is only available to users with admin rights.
