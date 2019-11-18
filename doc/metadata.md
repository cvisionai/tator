# Configuring project metadata

Metadata configuration will eventually be part of the front end and available to all users with full control over a project. However currently project metadata can only be configured via the Django admin console.

Before configuring metadata, make sure you have an [admin account](account.md) and have [created a project](project.md).

## Metadata in Tator

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

## Defining media types

Before you can upload and view media in Tator, a project must have at least one associated media type. To define an image type, do the following:

* Go to the admin console `<your-domain>/admin`.
* Click the `+ Add` button next to `Entity type media images`.
* Select the project, specify a name for the image type, check the `Uploadable` box, and set the file format to the dashed line (null). This will allow most image formats to be uploaded.
* Click `Save`.

For videos, do the following:

* Go to the admin console `<your-domain>/admin`.
* Click the `+ Add` button next to `Entity type media videos`.
* Select the project, specify a name for the video type, check the `Uploadable` box, and set the file format to the dashed line (null). This will allow most image formats to be uploaded.
* Click `Save`.

Now you can return to the projects view `<your-domain>/projects`, click on your project, and start uploading media via either the `Upload` button or the `+ New Section` drag and drop interface. Recursive directory uploads are only possible via the drag and drop interface.



In image classification the goal is to label an image according to its contents. To configure such a project:

* Click the `+ Add` button next to `Attribute type strings`.
* Specify a name for the attribute (such as "Class"), select the image type that was just created for `Applies to`, select the `Project`. If you had multiple attribute types that applied to the same entity type, you could specify the order that they appear in the front end with the `Order` field.
* Click `Save`.

Now if you return to the project detail view, you will be able to upload images. Clicking on one of the images will display a class field that can be used to label the image.

## Example: Object detection

Object detection
