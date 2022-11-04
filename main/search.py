import logging
import os
import datetime
from copy import deepcopy
from uuid import uuid1
import re
import time
import psycopg2
from psycopg2 import sql

from .worker import push_job

from django.db import connection

logger = logging.getLogger(__name__)

# Indicates what types can mutate into. Maps from type -> to type.
ALLOWED_MUTATIONS = {
    'bool': ['bool'],
    'int': ['int', 'float'],
    'float': ['int', 'float'],
    'enum': ['enum', 'string'],
    'string': ['enum', 'string'],
    'datetime': [ 'string', 'datetime'],
    'geopos': ['geopos'],
    'float_array': ['float_array'],
}

def get_connection(db_name):
    conn = psycopg2.connect(database=db_name,
                         host=os.getenv('POSTGRES_HOST'),
                         user=os.getenv('POSTGRES_USERNAME'),
                         password=os.getenv('POSTGRES_PASSWORD'))

    conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
    return conn

def _get_unique_index_name(entity_type, attribute):
    """ Get a unique index name based on an entity type and supplied attribute """
    type_name_sanitized=entity_type.__class__.__name__.lower()
    entity_name_sanitized=re.sub(r"[^a-zA-Z0-9]","_",entity_type.name).lower()
    attribute_name_sanitized=re.sub(r"[^a-zA-Z0-9]","_",attribute['name']).lower()
    index_name=f"tator_proj_{entity_type.project.id}_{type_name_sanitized}_{entity_name_sanitized}_{attribute_name_sanitized}"
    return index_name

def make_btree_index(db_name, project_id, entity_type_id, table_name, index_name,  attribute, psql_type, flush):
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {index_name}")
        cursor.execute("SELECT tablename,indexname,indexdef from pg_indexes where indexname = '{}'".format(index_name))
        if bool(cursor.fetchall()):
            return
        sql_str=f"""CREATE INDEX CONCURRENTLY {index_name} ON {table_name}
                                 USING btree (CAST(attributes->>'{attribute['name']}' AS {psql_type}))
                                 WHERE project={project_id} and meta={entity_type_id}"""
        cursor.execute(sql_str)
        print(sql_str)
def make_bool_index(db_name,project_id, entity_type_id, table_name, index_name,   attribute, flush):
    make_btree_index(db_name,project_id, entity_type_id, table_name, index_name, attribute, 'boolean', flush)


def make_int_index(db_name,project_id, entity_type_id, table_name, index_name,  attribute, flush):
    make_btree_index(db_name,project_id, entity_type_id, table_name, index_name, attribute, 'integer', flush)

def make_float_index(db_name,project_id, entity_type_id, table_name, index_name, attribute, flush):
    make_btree_index(db_name,project_id, entity_type_id, table_name, index_name, attribute, 'float', flush)

def make_string_index(db_name,project_id, entity_type_id, table_name, index_name,  attribute, flush, method='GIN'):
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {index_name}")
        cursor.execute("SELECT tablename,indexname,indexdef from pg_indexes where indexname = '{}'".format(index_name))
        if bool(cursor.fetchall()):
            return
        sql_str=f"""CREATE INDEX CONCURRENTLY {index_name} ON {table_name}
                                 USING {method} (CAST(attributes->>'{attribute['name']}' AS text) {method.lower()}_trgm_ops)
                                 WHERE project={project_id} and meta={entity_type_id}"""
        cursor.execute(sql_str)
        print(sql_str)

def make_datetime_index(db_name,project_id, entity_type_id, table_name, index_name,  attribute, flush):
    func_str=f"""CREATE OR REPLACE FUNCTION tator_timestamp(text)
                 RETURNS timestamp AS
                $func$
                SELECT CAST($1 as timestamp)
                $func$ LANGUAGE sql IMMUTABLE;"""
    sql_str=f"""CREATE INDEX CONCURRENTLY {index_name} ON {table_name} USING btree (tator_timestamp(attributes->>'{attribute['name']}')) WHERE project={project_id} AND meta={entity_type_id};"""
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {index_name}")
        cursor.execute("SELECT tablename,indexname,indexdef from pg_indexes where indexname = '{}'".format(index_name))
        if bool(cursor.fetchall()):
            return
        cursor.execute(func_str)
        cursor.execute(sql_str)
        print(sql_str)



def make_geopos_index(db_name,project_id, entity_type_id, table_name, index_name,   attribute, flush):
    sql_str = f"""CREATE INDEX {index_name} ON {table_name} using gist(ST_MakePoint((attributes -> '{attribute['name']}' -> 1)::float, (attributes -> '{attribute['name']}' -> 0)::float)) WHERE project={project_id} and meta={entity_type_id};"""
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {index_name}")
        cursor.execute("SELECT tablename,indexname,indexdef from pg_indexes where indexname = '{}'".format(index_name))
        if bool(cursor.fetchall()):
            return
        cursor.execute(sql_str)
        print(sql_str)

def make_vector_index(db_name, project_id, entity_type_id, table_name, index_name, attribute, flush):
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {index_name}")
        cursor.execute("SELECT tablename,indexname,indexdef from pg_indexes where indexname = '{}'".format(index_name))
        if bool(cursor.fetchall()):
            return
        # Create an index method for each access type
        for method in ['l2', 'ip', 'cosine']:
            sql_str = f"""CREATE INDEX {index_name}_{method} ON {table_name} using ivfflat(CAST(attributes -> '{attribute['name']}' AS vector({attribute['size']})) vector_{method}_ops) WHERE project={project_id} and meta={entity_type_id};"""
            cursor.execute(sql_str)
            print(sql_str)

def delete_psql_index(db_name,index_name):
    with get_connection(db_name).cursor() as cursor:
        cursor.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {index_name}")

class TatorSearch:
    """ Interface for managing psql indices
        There is one index per attribute type.
    """

    index_map = {
        'bool': make_bool_index,
        'int' : make_int_index,
        'float' : make_float_index,
        'enum' : make_string_index,
        'string' : make_string_index,
        'datetime' : make_datetime_index,
        'geopos' : make_geopos_index,
        'float_array' : make_vector_index,
    }

    def list_indices(self, project):
        """ Based on a project id, list all known indices """
        with get_connection(connection.settings_dict['NAME']).cursor() as cursor:
            cursor.execute("SELECT tablename,indexname,indexdef from pg_indexes where indexname LIKE '{}'".format(f"tator_proj_{project}_%"))
            return cursor.fetchall()

    def delete_project_indices(self, project):
        proj_indices = self.list_indices(project)
        for _,index_name,_ in proj_indices:
            push_job(delete_psql_index, args=(connection.settings_dict['NAME'], index_name), result_ttl=0)
            

    def delete_index(self, entity_type, attribute):
        """ Delete the index for a given entity type """
        index_name = _get_unique_index_name(entity_type, attribute)
        push_job(delete_psql_index, args=(connection.settings_dict['NAME'], index_name), result_ttl=0)

    def is_index_present(self, entity_type, attribute):
        """ Returns true if the index exists for this attribute """
        index_name = _get_unique_index_name(entity_type, attribute)
        with get_connection(connection.settings_dict['NAME']).cursor() as cursor:
            print(f"Looking for {index_name}")
            cursor.execute("SELECT tablename,indexname,indexdef from pg_indexes where indexname = '{}'".format(index_name))
            result=cursor.fetchall()
            return bool(result)

    def create_psql_index(self, entity_type, attribute, flush=False):
        """ Create a psql index for the given attribute """
        index_name = _get_unique_index_name(entity_type, attribute)
        if flush:
            self.delete_index(entity_type, attribute)
        if self.is_index_present(entity_type, attribute):
            print(f"Index '{index_name}' already exists.")
            return False

        index_func = self.index_map.get(attribute['dtype'],None)
        if index_func is None:
            print(f"Index '{index_name}' can't be created with unknown dtype {attribute['dtype']}")
            return False

        table_name = entity_type._meta.db_table.replace('type','')
        index_name = _get_unique_index_name(entity_type, attribute)
        print(f"Pushing CREATE {index_name}")
        push_job(index_func, args=(connection.settings_dict['NAME'], entity_type.project.id, entity_type.id, table_name, index_name, attribute, flush), result_ttl=0)

    def create_mapping(self, entity_type, flush=False):
        print(f"Creating indices for {entity_type.project.pk}/{entity_type.pk}")
        for attribute in entity_type.attribute_types:
            self.create_psql_index(entity_type, attribute, flush=flush)

    def rename_alias(self, entity_type, related_objects, old_name, new_name):
        """
        Adds an alias corresponding to an attribute type rename. Note that the old alias will still
        exist but can be excluded by specifying fields parameter in query_string queries. Entity
        type should contain an attribute type definition for old_name.

        :param entity_type: *Type object. Should be passed in before updating attribute_type json.
                            Fields attribute_types and attribute_type_uuids will be updated with new
                            name. Entity type will NOT be saved.
        :param old_name: Name of attribute type being mutated.
        :param new_name: New name for the attribute type.
        """
        element = None
        found_idx = None
        for idx,attribute_obj in enumerate(entity_type.attribute_types):
            if attribute_obj['name'] == old_name:
                found_idx = idx
                element = {**attribute_obj}
        if element is None:
            logger.error(f"Couldn't find {old_name} in {entity_type.name}")
            return []

        self.delete_index(entity_type, element)
        element['name'] = new_name
        entity_type.attribute_types[found_idx]['name'] = new_name
        self.create_psql_index(entity_type, element)
    
        return [entity_type]

    def check_rename(self, entity_type, old_name, new_name):
        """
        Checks rename operation and raises if it is invalid. See `rename_alias` for argument
        description.
        """
        # If no name change is happening, there is nothing to check
        if old_name == new_name:
            return None, None, None

        element = None
        for attribute_obj in entity_type.attribute_types:
            if attribute_obj['name'] == old_name:
                element = {**attribute_obj}

        element['name'] = new_name

        if self.is_index_present(entity_type, element) is True:
            raise(f'Index already exists with the specified name. ID={entity_type.id} {old_name}->{new_name}')
        

    def check_mutation(self, entity_type, name, new_attribute_type):
        """
        Checks mutation operation and raises if it is invalid. See `mutate_alias` for argument
        description.
        """
        found_it = False
        # Find old attribute type and create new attribute type.
        for idx, attribute_type in enumerate(entity_type.attribute_types):
            if attribute_type['name'] == name:
                replace_idx = idx
                old_dtype = attribute_type['dtype']
                old_mapping_name = attribute_type['name']
                found_it = True
                break
        
        
        if found_it != True:
            raise ValueError(f"Could not find attribute name {name} in entity type "
                             f"{type(entity_type).__name__} ID {entity_type.id}")

        new_dtype = new_attribute_type["dtype"]
        if new_dtype not in ALLOWED_MUTATIONS[old_dtype]:
            raise RuntimeError(f"Attempted mutation of {name} from {old_dtype} to {new_dtype} is "
                                "not allowed!")

    def mutate_alias(self, entity_type, name, new_attribute_type, mod_type, new_style=None):
        """
        Sets alias to new mapping type.

        :param entity_type: *Type object. Should be passed in before updating attribute_type json.
                            Field attribute_types will be updated with new dtype and style. Entity
                            type will not be saved.
        :param name: Name of attribute type being mutated.
        :param new_attribute_type: New attribute type for the attribute being mutated.
        :param mod_type: The type of modification to perform on the attribute: `update` will add
                         missing keys and update values of existing keys; `replace` will replace the
                         definition with `new_attribute_type`, which will result in deletion of
                         existing keys if they are not present in the new definition.
        :param new_style: [Optional] New display style of attribute type. Used to determine if
                          string attributes should be indexed as keyword or text.
        :returns: Entity type with updated attribute_types.
        """
        element = None
        el_idx = -1
        for idx,attribute_obj in enumerate(entity_type.attribute_types):
            if attribute_obj['name'] == name:
                element = {**attribute_obj}
                el_idx = idx
        if element is None:
            names = [a['name'] for a in entity_type.attribute_types]
            raise(Exception(f"Couldn't find {name} in {entity_type.name} {names}"))

        if element['dtype'] != new_attribute_type['dtype']:
            self.create_psql_index(entity_type, new_attribute_type, True)

        # Update DB record for dtype and return it
        if mod_type == "update":
            entity_type.attribute_types[el_idx].update(new_attribute_type)
        elif mod_type == "replace":
            entity_type.attribute_types[el_idx] = new_attribute_type
        return entity_type

    def delete_alias(self, entity_type, name):
        """
        Deletes existing alias.

        :param entity_type: *Type object.
        :param name: Name of attribute type being deleted.
        :returns: Entity type with updated attribute_types.
        """
        element = None
        for attribute_obj in entity_type.attribute_types:
            if attribute_obj['name'] == name:
                element = {**attribute_obj}
        if element is None:
            raise(f"Couldn't find {old_name} in {entity_type.name}")
        self.delete_index(entity_type, element)
        return entity_type
