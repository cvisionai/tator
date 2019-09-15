- Backup DB + Media Files
- Make new production user
- Fresh clone of repository
    + git clone
    + git submodule update --init
- Run migration prior to destruction
    + make migrate
    + Fill in sensible defaults
         + False for relativeCoords
- Destroy old pods
    + make clean 
- make cluster
- Post site up:
  - Convert localizations to relative
  + python3 manage.py shell
  + from main.util import makeLocalizationsRelative
  + makeLocalizationsRelative() #Idempotent function

