# Building ffmpeg.js

## Get the Emscripten SDK

```shell
git clone https://github.com/juj/emsdk.git
cd emsdk
emsdk update-tags
emsdk install sdk-tag-1.37.9-64bit
emsdk activate sdk-tag-1.37.9-64bit
source ./emsdk_env.sh
```

## Get and build ffmpeg.js

```shell
cd ~
git clone https://github.com/Kagami/ffmpeg.js.git
cd ffmpeg.js
git checkout fc67f0ca1a5d2edfa262e69e18e20df4c2d0ea88
git submodule update --init --recursive
make all
```

## Show location of static libraries:

```shell
find . -name *.a
```
