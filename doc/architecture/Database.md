# Database Application notes

## Server

The database server is postgre SQL; using django database objects to manage
data serialization to/from python. 

## Database Schema

To generate an up to date schema: 

<https://django-extensions.readthedocs.io/en/latest/graph_models.html>

TL;DR:

```shell
# To make a DOT file (to edit in something like Dia)
python3 manage.py graph_models -a > myDatabase.dot

# To view a dot file:
xdot myDatabase.dot

# To output a png file: 
python3 manage.py graph_models -a -g -o myDatabase.png
or 
dot -Tpng myDatabase.dot -o myDatabase.png
```

