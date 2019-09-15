#!/bin/bash

## Script to create a python module containing version information

pretty=$(git describe --long --all --dirty)
sha=$(git rev-parse HEAD)

echo """
#!/usr/bin/env python3

# Python 2 for compatibility sake

class Git:
  pretty='${pretty}'
  sha='${sha}'

class BuildTime:
  user='$(whoami)'
  machine='$(hostname)'
  time='$(date)'
  utc='$(date -Iseconds --utc)'

if __name__=='__main__':
   print('PRETTY={}'.format(Git.pretty))
   print('SHA={}'.format(Git.sha))
   print('USER={}'.format(BuildTime.user))
   print('MACHINE={}'.format(BuildTime.machine))
   print('TIME={}'.format(BuildTime.time))
   print('UTC={}'.format(BuildTime.utc))
"""
