#!/usr/bin/env python3

import argparse
import json
import os
import os.path
import sys
import math
import progressbar
import time
import pytator

def useRealTypes(obj):
    """
Given an obj, return an obj replacing string values with 1st class types
    """
    for k in obj.keys():
        if type(obj[k]) is str:
            try:
                # Try float first, then int
                obj[k] = float(obj[k])
                obj[k] = int(obj[k])
            except:
                pass

    return obj

def ingestLocalizations(args):
    """
Tool is used to ingest legacy annotations.

Example:
./ingestor.py -i ~/working/groundfish_demo/GP040016_1080p_crop.json --url http://natgeo.tatorapp.com/rest --token <YOUR_TOKEN> --typeId 2 --map id:TrackID h:height w:width --ignore type --trackField TrackID --trackTypeId 3

    """
    parser = argparse.ArgumentParser(sys.argv[1],
                                     description=__doc__)

    parser.add_argument("-i", "--input",
                        help="Path to input file")
    parser.add_argument("-d", "--directory",
                        help="Path to input file")
    parser.add_argument("--url",
                        required=True,
                        help="Server url")
    parser.add_argument("--token",
                        required=True,
                        help="Token for access")
    parser.add_argument("--project",
                        required=True,
                        help="Project ID")
    parser.add_argument("--localizationTypeId",
                        required=True,
                        help="Type of the localization to add")
    parser.add_argument("--mediaName",
                        help="Override media name")
    parser.add_argument("--mediaId",
                        help="Override media name")
    parser.add_argument("--scale",
                        help="Scale localizations due to transcoding",
                        type=float)
    parser.add_argument("--shiftY",
                        help="Shift localizations in y (before scale)",
                        type=float)
    parser.add_argument("--frameRateScale",
                        help="Scale localizations frame rate due to transcoding",
                        type=float)

    parser.add_argument("--map",nargs="*",
                        help="Map an old attribute to a new attribute (old:new)")
    parser.add_argument("--ignore",nargs="*",
                        help="Ignore an attribute from the json file.")
    parser.add_argument("--append", action="store_true", default=False,
                        help="Append localizations if ones currently exist")
    parser.add_argument("--no-normalize",
                        action='store_true',
                        default=False)
    parser.add_argument("--trackId",
                        help="Only upload detections with this track ID.")
    parser.add_argument("--saveIds",
                        help="If given, save database IDs to this path.")
    parser.add_argument("--version",
                        help="If given, save localizations with this version ID.")

    args=parser.parse_args(args)

    if args.directory and args.input:
        print("ERROR: Can't supply both directory(--directory) and file(--input) inputs");
        parser.print_help()
        sys.exit(-1)
    if args.directory == None and args.input == None:
        print("ERROR: Must supply either directory(--directory) of file(--input) inputs");
        parser.print_help()
        sys.exit(-1)

    if args.input:
        _ingestLocalizationsFromFile(args)
    else:
        dirContents=os.listdir(args.directory)
        filesToProcess=[]

        for fname in dirContents:
            comps=os.path.splitext(fname)
            if len(comps) > 1:
                if comps[1][1:] == 'json':
                    filesToProcess.append(fname)
        progressbar.streams.wrap_stderr()
        bar=progressbar.ProgressBar(prefix='Files',
                                    redirect_stdout=True,
                                    redirect_stderr=True)
        for fname in bar(filesToProcess):
            args.input=os.path.join(args.directory,fname)
            _ingestLocalizationsFromFile(args)

def _ingestLocalizationsFromFile(args):
    tator=pytator.Tator(args.url.rstrip('/'), args.token, args.project)
    medias=tator.Media
    element = None
    guess = None
    if args.mediaName:
        element = medias.byName(args.mediaName)
        guess = args.mediaName
    elif args.mediaId:
        element = medias.byId(args.mediaId)
        guess = f"(id: {args.mediaId})"
    else:
        base=os.path.basename(args.input)
        mp4Guess=os.path.splitext(base)[0]+'.mp4'
        print("INFO: Trying mp4 extension...{}".format(mp4Guess))
        element = medias.byName(mp4Guess)
        guess=mp4Guess

    if element is None:
        print(f"Could not find media {guess}, try using '--mediaName'")
        return -1

    mediaId=element["id"]

    reservedWords=['id']
    mapped={}
    ignored=[]

    if args.map:
        for mapArg in args.map:
            kv=mapArg.split(':')
            mapped[kv[0]] = kv[1]

    if args.ignore:
            ignored.extend(args.ignore)

    types = tator.LocalizationType
    typeElement = types.byTypeId(args.localizationTypeId)
    if typeElement is None:
        print(f"Unknown Localization Type ID ({args.localizationTypeId})")
        sys.exit(-1)

    print(f"Applying localizations of type '{typeElement['type']['name']}'(id={args.localizationTypeId}) to media='{element['name']}' (id={mediaId})")

    localizations=tator.Localization

    with open(args.input, 'r') as data:
        obj=json.load(data)
        detections=obj["detections"]

        count=0
        dimsToScale=["h","w","x","y"]

        if args.trackId:
            detections = [det for det in detections if det["id"] == args.trackId]

        for detection in detections:
            count=count+1
            if (count % 100 == 0):
                print(f"Processed {count} localizations")

            if args.shiftY:
                new=float(detection["y"]) + args.shiftY
                detection["y"] = str(new)

            if args.scale:
                for dim in dimsToScale:
                    detection[dim] = args.scale * float(detection[dim])
                    detection[dim] = int(round(detection[dim]))

            if args.frameRateScale:
                detection['frame'] = int(round(args.frameRateScale * float(detection['frame'])))

            # By default we normalize, not no == true
            if not args.no_normalize:
                widths=['x', 'x0', 'x1', 'w']
                heights=['y','y0','y1','h']
                # Convert to floats first
                for dim in widths+heights:
                    if dim in detection:
                        if type(detection[dim]) == str:
                            detection[dim] = float(detection[dim])
                for width in widths:
                    if width in detection:
                        detection[width] = detection[width] / element['width']
                for height in heights:
                    if height in detection:
                        detection[height] = detection[height] / element['height']

            for k in ignored:
                if k in detection:
                    del detection[k]

            for k in reservedWords:
                if k in detection and k not in mapped:
                    print(f"found reserved word '{k}', needs '--map' or '--ignore'")
                    sys.exit(-1)

            for k,v in mapped.items():
                detection[v] = detection[k]
                del detection[k]

            detection['media_id'] = mediaId
            detection['type']=args.localizationTypeId

            if args.version:
                detection['version'] = args.version

            detection = useRealTypes(detection)

        existing=localizations.filter({"media_id": mediaId,
                                       "type": args.localizationTypeId})
        if existing and not args.append:
            print(f"Not in append-mode Skipping {element['name']}")
            return

        # Block up the transport because django drops large POSTs
        blocks=math.ceil(len(detections) / 1000)
        dbIds = []
        for block in range(blocks):
            startIdx=(1000*block)
            endIdx=(1000*(block+1))
            code, msg = localizations.addMany(detections[startIdx:endIdx])
            dbIds += msg['id']
            print(f"{code} : {msg}")
        if args.saveIds:
            with open(args.saveIds, "w") as idFile:
                json.dump(dbIds, idFile)

def ingestTracks(args):
    parser = argparse.ArgumentParser(sys.argv[1],
                                     description=__doc__)
    parser.add_argument("-i", "--input",
                        help="Path to input file",
                        required=True)
    parser.add_argument("--mediaName",
                        help="Override media name")
    parser.add_argument("--mediaId",
                        help="Override media name (using id)")
    parser.add_argument("--url",
                        required=True,
                        help="Server url")
    parser.add_argument("--token",
                        required=True,
                        help="Token for access")
    parser.add_argument("--project",
                        required=True,
                        help="Project ID")
    parser.add_argument("--trackField",
                        help="Field to use for track association(after map)")

    parser.add_argument("--trackTypeId",
                        help="typeId of the TrackType")

    parser.add_argument("--localizationTypeId",
                        required=True,
                        help="Type of the localization to query")

    parser.add_argument("--map",nargs="*",
                        help="Map an old attribute to a new attribute (old:new)")
    parser.add_argument("--ignore",nargs="*",
                        help="Ignore an attribute from the json file.")
    parser.add_argument("--trackId",
                        help="Only upload a specific track ID.")
    parser.add_argument("--localizationIds",
                        help="Path to file containing localization IDs for this track.")
    parser.add_argument("--version",
                        help="If given, save tracks with this version ID.")

    args=parser.parse_args(args)
    tator=pytator.Tator(args.url.rstrip('/'), args.token, args.project)
    mapped={}
    tracksAPI=tator.Track
    localizations=tator.Localization
    ignored=[]

    element = None
    guess = None
    if args.mediaName:
        element = tator.Media.byName(args.mediaName)
        guess = args.mediaName
    elif args.mediaId:
        element = tator.Media.byId(args.mediaId)
        guess = f"(id: {args.mediaId})"
    else:
        base=os.path.basename(args.input)
        mp4Guess=os.path.splitext(base)[0]+'.mp4'
        print("INFO: Trying mp4 extension...{}".format(mp4Guess))
        element = tator.Media.byName(mp4Guess)
        guess=mp4Guess

    if element is None:
        print(f"Could not find media {guess}, try using '--mediaName'")
        sys.exit(-1)

    mediaId=element["id"]

    if args.map:
        for mapArg in args.map:
            kv=mapArg.split(':')
            mapped[kv[0]] = kv[1]
    if args.ignore:
            ignored.extend(args.ignore)

    with open(args.input, 'r') as data:
        obj=json.load(data)
        tracks=obj["tracks"]
        count=0
        if args.trackId:
            tracks = [track for track in tracks if track["id"] == args.trackId]
        filt = {
            "type": args.localizationTypeId,
            "media_id": mediaId,
        }
        if args.version:
            filt = {**filt, "version": args.version}
        for track in tracks:
            # 0.) Transform the json object to match what the
            # server wants
            for k,v in mapped.items():
                track[v] = track[k]
                del track[k]

            for k in ignored:
                if k in track:
                    del track[k]

            if args.localizationIds:
                with open(args.localizationIds, "r") as idFile:
                    localizationIds = json.load(idFile)
                mediaIds = [mediaId]
            else:
                localizationIds=[]
                mediaIds=set()
                trackIds=set()
                #1.) Get all the localizations for this track id
                queryString=f"{args.trackField}::{track[args.trackField]}"
                localizationsInTrack = tator.Localization.filter({
                    **filt,
                    "search": f"{args.trackField}:{track[args.trackField]}",
                })
                for localization in localizationsInTrack:
                    localizationIds.append(localization["id"])
                    mediaIds.add(localization['media'])

            track=useRealTypes(track)
            if len(mediaIds):
                tracksAPI.add(args.trackTypeId, list(mediaIds),track,
                              localizationIds, args.version)
            else:
                print("ERROR: Can't find localizations for {}".format(track[args.trackField]))
                sys.exit(-1)
            if args.version:
                track['version'] = args.version
            count=count+1
            print(f"Track {count}/{len(tracks)}", end="\r")

    print("")

def ingestMedia(args):
    parser = argparse.ArgumentParser(sys.argv[1],
                                     description=__doc__)
    parser.add_argument("-d", "--directory",
                        help="Path to input directory")
    parser.add_argument("-f", "--file",
                        help="Path to input file")
    parser.add_argument("--typeId",
                        help="Type ID of the media to import",
                        type=int,
                        required=True)
    parser.add_argument("--project",
                        help="Project ID",
                        required=True)
    parser.add_argument("--url",
                        required=True,
                        help="Server url")
    parser.add_argument("--token",
                        required=True,
                        help="Token for access")
    parser.add_argument("--extension",
                        default="mp4",
                        help="video file extension")
    parser.add_argument("--section",
                        help="Section to apply to uploaded media")
    parser.add_argument("--parallel",
                        type=int,
                        default=4,
                        help="Number of workers use for uploads")

    args=parser.parse_args(args)

    if args.directory and args.file:
        print("ERROR: Can't supply both directory and file inputs");
        parser.print_help()
        sys.exit(-1)
    if args.directory == None and args.file == None:
        print("ERROR: Must supply either directory of file inputs");
        parser.print_help()
        sys.exit(-1)

    tator=pytator.Tator(args.url.rstrip('/'), args.token, args.project)
    medias=tator.Media


    def importFile(filepath, showProgress):
        md5=pytator.md5sum.md5_sum(filepath)
        medias.uploadFile(args.typeId, filepath, False, showProgress, md5=md5, section=args.section)
        return md5

    if args.directory:
        filesToProcess=[]
        for root, subdirs, files in os.walk(args.directory):
            for fname in files:
                comps=os.path.splitext(fname)
                if len(comps) > 1:
                    if comps[1][1:] == args.extension:
                        filesToProcess.append(os.path.join(root, fname))

        progressbar.streams.wrap_stderr()
        bar=progressbar.ProgressBar(prefix='Files',
                                    redirect_stdout=True,
                                    redirect_stderr=True)

        in_process=[]
        for fname in bar(filesToProcess):
            # Delete in process elements first
            for md5 in in_process:
                    media_element=medias.byMd5(md5)
                    if media_element:
                        in_process.remove(md5)
            while len(in_process) >= args.parallel:
                for md5 in in_process:
                    media_element=medias.byMd5(md5)
                    if media_element:
                        in_process.remove(md5)
                print("Waiting for transcodes...")
                print(f"In process = {in_process}")
                time.sleep(2.5);

            md5=importFile(os.path.join(args.directory, fname), False)
            in_process.append(md5)
    else:
        importFile(args.file, True)







if __name__=="__main__":
    functions = {
        'localizations' : ingestLocalizations,
        'tracks' : ingestTracks,
        'media' : ingestMedia
        }
    parser = argparse.ArgumentParser(
        description='CLI wrapper to ingest json metadata into tator online')

    parser.add_argument('action',
                        choices=functions.keys(),
                        help='Requested import type')

    args=parser.parse_args(sys.argv[1:2]);

    if len(sys.argv) >= 3:
        functions[args.action](sys.argv[2:])
    else:
        print("ERROR: Missing arguments")
        parser.print_help()
        sys.exit(-1)
