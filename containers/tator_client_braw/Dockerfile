FROM cvisionai/tator_client:latest

RUN apt-get update && apt-get install -y --no-install-recommends \
        rpm2cpio cpio build-essential \
        && rm -rf /var/lib/apt/lists
COPY containers/tator_client_braw/Blackmagic_RAW_Linux_2.2.1.tar .
RUN tar xvf Blackmagic_RAW_Linux_2.2.1.tar
RUN cd Blackmagic\ RAW && rpm2cpio *.rpm | cpio -idmv
RUN git clone https://github.com/AkBKukU/braw-decode.git
RUN cp -r Blackmagic\ RAW/usr/lib64/blackmagic/BlackmagicRAWSDK/Linux/Libraries braw-decode/.
RUN cp -r Blackmagic\ RAW/usr/lib64/blackmagic/BlackmagicRAWSDK/Linux/Include braw-decode/.
RUN rm Blackmagic_RAW_Linux_2.2.1.tar && rm -rf Blackmagic\ RAW
WORKDIR braw-decode
RUN make
ENV PATH=$PATH:/scripts/braw-decode
COPY containers/tator_client_braw/upload_braw.py .

