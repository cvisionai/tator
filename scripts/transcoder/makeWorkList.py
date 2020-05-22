""" Makes a work list given contents of an extracted tarball/zip """

import os
import argparse
import json
import subprocess
import hashlib
import pytator

if __name__=="__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser = pytator.tator.cli_parser(parser)
    parser.add_argument("directory")
    args = parser.parse_args()

    tator = pytator.Tator(args.url, args.token, args.project)

    # This actually gets images + videos
    videos = []
    images = []
    state_files = []
    localization_files = []

    for root, dirs, files in os.walk(args.directory):
        for fp in files:
            path = os.path.join(root,fp)
            cmd = [
                "ffprobe",
                "-v","error",
                "-show_entries", "stream",
                "-print_format", "json",
                "-select_streams", "v",
                path,
            ]
            try:
                output = subprocess.run(cmd,
                                        stdout=subprocess.PIPE,
                                        check=True).stdout
                video_info = json.loads(output)
                print(video_info)
                for idx, stream in enumerate(video_info["streams"]):
                    if stream["codec_type"] == "video":
                        codec_name = stream["codec_name"]
                        print(f"codec_name = {codec_name}")
                        # TODO: Determine a better way to know image vs. video?
                        if codec_name == "png" or codec_name == "mjpeg":
                            images.append(path)
                            print(f"Adding image {path}")
                            break
                        else:
                            print(f"Adding video {path}")
                            videos.append(path)
                            break
            except:
                pass

    md5_lookup={}

    def make_workflow_video(video):
        # Calculate md5
        md5 = md5_lookup[video]

        base = os.path.splitext(video)[0]
        # This is the arguments for each iteration of the transcode DAG
        paths = {
            'dirname': os.path.dirname(video),
            'base': os.path.basename(base),
            'entity_type': '-1', # Have server auto compute this
            'name': os.path.basename(video),
            'md5': md5
        }
        return paths

    def make_workflow_image(image):
        # Calculate md5
        md5 = md5_lookup[image]

        base = os.path.splitext(image)[0]
        # This is the arguments for each iteration of the transcode DAG
        paths = {
            'url': 'None',
            'original': image,
            'entity_type': '-1', # Have server auto compute this
            'name': os.path.basename(image),
            'md5': md5
        }
        return paths

    def states_for_media(media):
        base = os.path.splitext(media)[0]
        l = []
        for root, dirs, files in os.walk(os.path.join(args.directory,
                                                      base,
                                                      "states")):
            for fp in files:
                if os.path.splitext(fp)[-1].lower() == ".csv":
                    state_files.append({"md5": md5_lookup[media],
                                        "file": os.path.join(root,fp)})
        return l

    def localizations_for_media(media):
        base = os.path.splitext(media)[0]
        l=[]
        for root, dirs, files in os.walk(os.path.join(args.directory,
                                                      base,
                                                      "localizations")):
            for fp in files:
                if os.path.splitext(fp)[-1].lower() == ".csv":
                    l.append({"md5": md5_lookup[media],
                              "file": os.path.join(root,fp)})
        return l


    # Pre-calculate hash of videos + images
    for media in [*videos, *images]:
        with open(media,'rb') as fp:
            data = fp.read()
            md5_lookup[media] = hashlib.md5(data).hexdigest()
            state_files.extend(states_for_media(media))
            localization_files.extend(localizations_for_media(media))

    # Remove media that is corrupt prior to trying to transcode
    def is_valid(media):
        # Check to make sure the image/video is not corrupt
        cmd = [
            "ffprobe",
            "-v","error",
            "-show_entries", "stream",
            "-print_format", "json",
            "-select_streams", "v",
            "{}".format(media),
        ]
        status = subprocess.run(cmd).returncode
        if status != 0:
            print(f"Removing {media} from worklist due to video corruption")
            return False
        else:
            print(f"Adding {media} to worklist")
            return True

    print(f"Putting jsons into {args.directory}")
    def split_list_into_k8s_chunks(data, name):
        MAX_NUM_WORK_FILES=20
        MAX_FILE_SIZE=220000
        work_packets=['' for x in range(MAX_NUM_WORK_FILES)]
        temp_list=[]
        work_packet=0

        # Initialize empty files just incase
        for x in range(MAX_NUM_WORK_FILES):
            print(f'Attempting to save {os.path.join(args.directory, f"{name}_{work_packet}.json")}')
            with open(os.path.join(args.directory, f"{name}_{x}.json"), 'w') as packet_file:
                json.dump(temp_list, packet_file)

        # Iterate through each data and figure out how to break it up into ~220Kb chunks
        for x in data:
            temp_list.append(x)
            json_str = json.dumps(temp_list)
            if len(json_str) > MAX_FILE_SIZE:
                temp_list.pop()
                with open(os.path.join(args.directory, f"{name}_{work_packet}.json"), 'w') as packet_file:
                    print(f"temp_list = {temp_list}")
                    json.dump(temp_list, packet_file)
                    temp_list = [x]
                    work_packet += 1
        if len(temp_list) > 0:
            print(f"temp_list = {temp_list}")
            with open(os.path.join(args.directory, f"{name}_{work_packet}.json"), 'w') as packet_file:
                json.dump(temp_list, packet_file)

    # Initialize all the work files first
    work=[make_workflow_video(vid) for vid in videos if is_valid(vid)]
    split_list_into_k8s_chunks(work,"videos")

    # don't split images into work packets
    work=[make_workflow_video(img) for img in images if is_valid(img)]
    with open(os.path.join(args.directory, f"images.json"), 'w') as packet_file:
        json.dump(work, packet_file)

    split_list_into_k8s_chunks(localization_files,"localizations")

    split_list_into_k8s_chunks(state_files, "states")
