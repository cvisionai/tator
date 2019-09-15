#!/bin/bash

pylint3 $@
ret=$?
if [ ${ret} -eq 1 ] || [  ${ret} -eq 2 ] || [ ${ret} -eq 32 ]; then
    echo "FATAL ERROR from linter"
    exit 255
else
    exit 0
fi
