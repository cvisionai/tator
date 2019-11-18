# Creating a project

Project creation and configuration will eventually be part of the front end and available to all users. However currently projects can only be created via the Django admin console.

* Make sure you are logged in with an admin account. If you don't have an admin account, follow the instructions [here](account.md).
* Open the admin console at `<your-domain>/admin`.
* Click `Projects`.
* Click `Add Project`.
* Enter the name of the project, select yourself for `Creator`, and optionally enter a `Summary`. Other fields can be left blank.
* Click `Save`.
* Now click `Memberships`.
* Click `Add Membership`.
* Select the project you just created, select yourself for `User`, and set the `Permission` to `Full Control`.

## Adding users to a project

* You can add more users to the app by creating more `User` objects.
* Users can be added to a project with additional `Membership` objects.
* You can restrict access to a project using the `Permission` field of a `Membership` object:

  * **View Only** means a user can only look at media and annotations.
  * **Can Edit** means a user can modify annotations on existing project media.
  * **Can Transfer** means a user can download and upload media in addition to editing.
  * **Can Execute** means a user can upload, download, modify, and launch algorithms.
  * **Full Control** means a user can change project settings.

  Note that only the project creator can delete a project.

Next step: [Configuring project metadata](metadata.md)
