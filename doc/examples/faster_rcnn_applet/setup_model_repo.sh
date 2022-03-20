$!/bin/bash

mkdir -p model_repo/preproc/1
mkdir -p model_repo/faster_rcnn_inception_v2/1
mkdir -p model_repo/faster_rcnn_inception_v2_with_preproc/1

wget -O /tmp/faster_rcnn_inception_v2_coco_2018_01_28.tar.gz http://download.tensorflow.org/models/object_detection/faster_rcnn_inception_v2_coco_2018_01_28.tar.gz
cd /tmp && tar xzf faster_rcnn_inception_v2_coco_2018_01_28.tar.gz
mv /tmp/faster_rcnn_inception_v2_coco_2018_01_28/frozen_inference_graph.pb model_repo/faster_rcnn_inception_v2/1/model.graphdef

python faster_rcnn_pipeline.py model_repo/preproc/1/model.dali

echo "Faster R-CNN model ready."
