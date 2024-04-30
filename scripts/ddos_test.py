#!/usr/bin/python3

import tator
import argparse
from concurrent.futures import ThreadPoolExecutor
import time
import numpy as np

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", help="Host containing Tator server", required=True)
    parser.add_argument("--token", help="Token file containing Tator token", required=True)
    parser.add_argument("--max-workers", default=10, type=int)
    parser.add_argument("--chunk_size", default=500, type=int)
    parser.add_argument("media_id", type=int)
    parser.add_argument("localization_type_id", type=int)
    args = parser.parse_args()

    # Create a Tator client
    api = tator.get_api(host=args.host, token=args.token)
    localization_type_obj = api.get_localization_type(args.localization_type_id)
    project = localization_type_obj.project
    print(f"Testing {localization_type_obj.name} of project {project}")

    #  make a  bunch  of random  boxes
    boxes = []
    for i in range(1000):
        box = {
            "media_id": args.media_id,
            "frame": 0,
            "type": args.localization_type_id,
            "x": 0.5,
            "y": 0.5,
            "height": 0.2,
            "width": 0.2,
            "attributes": {"Label": "Trash"},
        }
        boxes.append(box)

    start = time.time()
    deltas = []
    for resp in tator.util.chunked_create(
        api.create_localization_list, project, body=boxes, chunk_size=args.chunk_size
    ):
        deltas.append(time.time() - start)
        start = time.time()

    print(f"Average time per chunk ({args.chunk_size}): {round(np.mean(deltas),2)} seconds")
    print(f"Max time per chunk: {round(np.max(deltas),2)} seconds")
    print(f"Min time per chunk: {round(np.min(deltas),2)} seconds")
    print(f"Time per box = {round((np.mean(deltas)*1000000)/args.chunk_size,2)} microseconds")
