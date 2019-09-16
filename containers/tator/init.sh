#!/bin/bash

#Need to turn on ltree extension first
python3 manage.py migrate django_ltree

python3 manage.py makemigrations main --no-input
ret=$?
echo "return of manage.py == $?"
# THis returns 3 if it needs user input
if [ $? -eq 3 ]; then
    echo "Detected a problem with migrations"
   return 0;
fi

echo "About to call show migrations"
migrations=`python3 manage.py showmigrations`
if [ `echo $migrations | grep "(no migrations)" | wc -l` -eq 0 ]; then
    echo "Trying to migrate"
    python3 manage.py migrate
fi

