# Front End Test Procedure
This procedure outlines the tests to perform when a UI update has been made.

## Annotator Tests
------------------
Follow these steps to test the annotation tools.

### Localization Related Tests
1) Create a test project using setup_project.py
2) Open the project detail page for Test Project in the browser.
3) Create a new folder named "Folder A" and upload some videos into the project
4) Create a new folder named "Folder B" and upload some images into the project
5) Rename the section containing images to "Images" and videos to "Videos". Reload to verify that the name of these sections remains.
6) Upon reload, verify the number of images and videos is correct in the section summaries.
7) Attempt to download the image section.
8) Attempt to download an individual image.
9) Attempt to download the video section.
10) Attempt to download an individual video.
11) Open an image.
12) Draw 3 boxes.
13) Change the Enum attribute of each of the three boxes to different values. Verify that each box is a different color.
14) Move the boxes around and resize them. Reload to verify the changes persist.
15) Create a few lines, drawn in different directions.
16) Create a few dots.
17) Select the Baseline version, then make some dots there too.
18) Go back to the Test Version version, and verify that the dots created on each layer appear and have different colors.
19) Reload and make sure everything looks the same.
20) Zoom in on the canvas, pan, and zoom out.
21) Change values of the String attribute and verify that the grouping in the entity browser is updated appropriately.
22) Take a screenshot of some boxes and verify that the image matches what is boxed on the canvas.
23) Click the redraw icon on some localizations and redraw. Reload to verify the localizations are the same.
24) Select some localizations with the entity browser and delete them with both the del key and the trash icon.
25) Reload to make sure they are really gone.
26) Go back to the project detail page and attempt to download annotations for the Images section.
27) Repeat steps 18-26 on a video.
28) Perform cut and paste with a localization

### State Related Tests
1) Perform the following steps to test out state types in a single video
    - python3 ./setup_project --host <host> --token <token> --name <new_project_name> --create-state-latest-type --create-state-range-type --create-track-type
    - Upload a video
    - Create new states with the right click menu at various points in the video.
    - Alter the start frame, end frame, and corresponding booleans. Verify the timeline has the right regions highlighted.
    - Play the video and toggle the boolean switches in the activity frame panel. Verify the timeline bar is colored appropriately and the states are saved.
    - Create new tracks by drawing a box, right click on it and creating a track.
    - Extend the track and trim the track endpoints with the right click menu
    - Merge two tracks with the right click menu
    - Add detection (ie localization) to track with the right click menu
2) Perform the following steps to test out a state type (latest interpolation, frame association) in a multiview media
    - python3 ./setup_project --host <host> --token <token> --name <new_project_name> --create-state-latest-type --create-state-range-type
    - Upload same video twice and create a multiview video with the following:
    - python3 ./create_multi_video.py --host <host> --token <token> --project <project_id> --media <media_id_1> <media_id_2> --multi-media-name test --layout-rows 2 --layout-cols 1 --quality 360 --section-name test_multi_folder
    - Repeat frame-state creation (ie not tracks) from step 29

## Video Playback Tests
-----------------------
Follow these steps to test the video playback capabilities.

Prerequisites:
- Single video with multiple streaming video qualities (preferably at least 144, 360, 720)
- Multiview video (at least 2 videos, preferably 4)

Steps
1) Upload a video
2) Ensure the playback rate is 1.0
3) Jump around to both buffered/unbuffered scrub regions. Make sure the high quality frame is shown
4) Play the video in an unbuffered scrub region. Verify video is playing back.
5) Rewind the video in an unbuffered scrub region. Verify video is playing back.
6) Repeat the above steps in a buffered region. 
7) While playing, ensure the fast forward button, rewind button, playback rate control, and playback quality control widgets are disabled. The scrub buffer downloading should also be paused while playing.
8) Change the quality. Ensure the scrub buffer doesn't re-download/change.
9) Play the video and verifiy the quality changed.
10) Play the video 2 seconds from the end. Ensure it finishes the video.
11) Rewind the video 2 seconds from the beginning. Ensure it stops at 0.
12) Reload the video, change the rate to 4x, and jump to an unbuffered scrub region. Attempt to play. Verify a window alert is displayed and the video does not play.
13) Change the quality to the highest quality (greater than 360p). In the next steps, verify in the next two steps the playback quality is lower than the selected quality.
14) In a buffered scrub region, play the video at the 4x rate. Verify the video is playing back at a faster rate.
15) Repeat the above while going playing backwards.
16) Scrub around the video (click on the timeline dot and drag around)
17) Repeat the above steps with a multi-view video. Ignore the playback quality verificaiton.