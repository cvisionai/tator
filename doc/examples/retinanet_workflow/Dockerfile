FROM nvcr.io/nvidia/pytorch:21.10-py3
RUN python -m pip install 'git+https://github.com/facebookresearch/detectron2.git'
RUN python -m pip install tator opencv-python
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install ffmpeg libsm6 libxext6 -y
COPY infer.py /infer.py
