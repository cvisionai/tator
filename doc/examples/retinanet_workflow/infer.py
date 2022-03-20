import os
import logging

import tator
import cv2
import torch
from detectron2 import model_zoo
from detectron2.engine import DefaultPredictor
from detectron2.config import get_cfg
from detectron2.data import MetadataCatalog

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Read environment variables.
host = os.getenv('HOST')
token = os.getenv('TOKEN')
project_id = int(os.getenv('PROJECT_ID'))
media_ids = [int(id_) for id_ in os.getenv('MEDIA_IDS').split(',')]

# Set up the tator API.
api = tator.get_api(host, token)

# Find the localization type for this project.
types = api.get_localization_type_list(project_id)
for box_type in types:
    found_label = False
    for attribute_type in box_type.attribute_types:
        if attribute_type.name == "Label":
            logger.info(f"Found attribute type 'Label'!")
            found_label = True
    if box_type.dtype == "box" and found_label:
        logger.info(f"Using box type {box_type.id}!")
        break

# Set up detectron model.
logging.info(f"Setting up model...")
cfg = get_cfg()
cfg.merge_from_file(model_zoo.get_config_file("COCO-Detection/retinanet_R_50_FPN_3x.yaml"))
cfg.MODEL.RETINANET.SCORE_THRESH_TEST = 0.5
cfg.MODEL.WEIGHTS = model_zoo.get_checkpoint_url("COCO-Detection/retinanet_R_50_FPN_3x.yaml")
if torch.cuda.is_available():
    logger.info("Found CUDA, using GPU!")
    logger.info("Inference will be performed on every frame!")
    frames_per_inference = 1
else:
    logger.info("CUDA not available, using CPU!")
    logger.info("Inference will be perfomed only once per 30 frames!")
    cfg.MODEL.DEVICE = 'cpu'
    frames_per_inference = 30
predictor = DefaultPredictor(cfg)
class_names = MetadataCatalog.get("coco_2017_train").thing_classes

# Iterate through each video.
for media_id in media_ids:

    # Download video.
    media = api.get_media(media_id)
    logger.info(f"Downloading {media.name}...")
    out_path = f"/tmp/{media.name}"
    for progress in tator.util.download_media(api, media, out_path):
        logger.info(f"Download progress: {progress}%")

    # Do inference on each video.
    logger.info(f"Doing inference on {media.name}...")
    localizations = []
    vid = cv2.VideoCapture(out_path)
    frame_number = 0
    while True:
        ret, frame = vid.read()
        if not ret:
            break
        if frame_number % frames_per_inference == 0:
            logger.info(f"DOING INFERENCE ON FRAME {frame_number}")
            height = frame.shape[0]
            width = frame.shape[1]
            outputs = predictor(frame)["instances"]
            for box, class_, score in zip(outputs.pred_boxes, outputs.pred_classes, outputs.scores):
                # Create a localization spec and add it to list.
                spec = {
                    'type': box_type.id,
                    'media_id': media.id,
                    'x': float(box[0] / width),
                    'y': float(box[1] / height),
                    'width': float((box[2] - box[0]) / width),
                    'height': float((box[3] - box[1]) / height),
                    'frame': frame_number,
                    'Label': str(class_names[class_]),
                    'Confidence': float(score),
                }
                localizations.append(spec)
        frame_number += 1
    vid.release()

    # Create the localizations in the video.
    logger.info(f"Uploading object detections on {media.name}...")
    num_created = 0
    for response in tator.util.chunked_create(api.create_localization_list,
                                              project_id,
                                              localization_spec=localizations):
        num_created += len(response.id)
    logger.info(f"Successfully created {num_created} localizations on {media.name}!")
    logger.info("-------------------------------------------------")

logger.info(f"Completed inference on {len(media_ids)} files.")
