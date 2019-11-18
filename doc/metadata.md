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
* Select the project, specify a name for the video type, check the `Uploadable` box, and set the file format to the dashed line (null). This will allow most video formats to be uploaded.
* Click `Save`.

Now you can return to the projects view `<your-domain>/projects`, click on your project, and start uploading media via either the `Upload` button or the `+ New Section` drag and drop interface. Recursive directory uploads are only possible via the drag and drop interface.

Note that currently the front-end only supports at most one image type and one video type per project.

## Defining media metadata

Media metadata consists of attributes that are applied to a file (video or image). For example, suppose we wish to do image classification. We could set up a project for this by creating a string attribute type:

* Go to the admin console `<your-domain>/admin`.
* Click the `+ Add` button next to `Attribute type strings`.
* Specify a name for the attribute (such as "Class"), select the image type that was just created for `Applies to`, select the `Project`. If you had multiple attribute types that applied to the same entity type, you could specify the order that they appear in the front end with the `Order` field.
* Click `Save`.

Now if you return to the project detail view, clicking on one of the images will display a class field that can be used to label the image. Again, strings are just one of seven possible attribute types, and you can define multiple attribute types with the same data type.

## Defining localization types and localization metadata

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

## Defining state types and state metadata

Suppose we have a need to track an object that persists through multiple video frames, such as a person walking through the field of view. In another case, suppose our video data has geoposition data attached to it, and we wish to include this in Tator. Time varying information such as these can be captured by defining a `EntityTypeState`:

* Go to the admin console `<your-domain>/admin`.
* Click the `+ Add` button next to `Entity type states`.
* Select the `Project`, give the state type a name, and select the `Media` type for which these states can exist. Select the association type for this state, namely `Relates to on or more media items` if the state applies to a series of files, `Relates to a specific frame in a video` if the state applies globally to video frames (such as temperature, geoposition, etc.), or `Relates to localization(s)` if the state represents a conventional track. `Interpolation should be left as `None` except for frame associated states, in which case `Latest` may be appropriate.
* Click `Save`.

Like localization and media types, state types typically need attribute types to be defined for them to be useful; this can be accomplished similarly to previous steps. Because it is often impractical to create and label states with a large amount of associated frames or localizations by hand, it is currently only possible to create states via the Tator REST API (`<your-domain>/rest`). Once a state object has been created, however, users can view and interact with state attribute values.
