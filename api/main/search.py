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
    "bool": [],
    "int": ["float"],
    "float": ["int"],
    "enum": ["string"],
    "string": [
        "enum",
    ],
    "datetime": [],
    "geopos": [],
    "float_array": [],
}


def get_connection(db_name):
    conn = psycopg2.connect(
        database=db_name,
        host=os.getenv("POSTGRES_HOST"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
    )

    conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
    return conn


def _get_unique_index_name(entity_type, attribute):
    """Get a unique index name based on an entity type and supplied attribute"""
    type_name_sanitized = entity_type.__class__.__name__.lower()
    entity_name_sanitized = re.sub(r"[^a-zA-Z0-9]", "_", entity_type.name).lower()
    attribute_name_sanitized = re.sub(r"[^a-zA-Z0-9]", "_", attribute["name"]).lower()
    if attribute["name"].startswith("$"):
        index_name = f"tator_proj_{entity_type.project.id}_{type_name_sanitized}_internal_{attribute_name_sanitized}"
    else:
        index_name = f"tator_proj_{entity_type.project.id}_{type_name_sanitized}_{entity_name_sanitized}_{attribute_name_sanitized}"
    return index_name


def _get_column_name(attribute):
    name = re.sub(r"[^a-zA-Z0-9] ", "_", attribute["name"])
    if name.startswith("$"):
        return name[1:]  # internal field
    else:
        return f"attributes->>'{name}'"  # embedded in JSONB field


def make_btree_index(
    db_name,
    project_id,
    entity_type_id,
    table_name,
    index_name,
    attribute,
    psql_type,
    flush,
    concurrent,
):
    concurrent_str = ""
    if concurrent:
        concurrent_str = "CONCURRENTLY"
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(
                sql.SQL("DROP INDEX {concurrent} IF EXISTS {index_name}").format(
                    index_name=sql.Identifier(index_name), concurrent=sql.SQL(concurrent_str)
                )
            )
        cursor.execute(
            "SELECT tablename,indexname,indexdef from pg_indexes where indexname = %s",
            (index_name,),
        )
        if bool(cursor.fetchall()):
            return
        col_name = _get_column_name(attribute)
        if psql_type == "native":
            sql_str = sql.SQL(
                """CREATE INDEX {concurrent} {index_name} ON {table_name}
                            USING btree ({col_name})
                            WHERE project=%s"""
            ).format(
                index_name=sql.SQL(index_name),
                concurrent=sql.SQL(concurrent_str),
                table_name=sql.Identifier(table_name),
                col_name=sql.SQL(col_name),
            )
            cursor.execute(sql_str, (project_id,))
        else:
            sql_str = sql.SQL(
                """CREATE INDEX {concurrent} {index_name} ON {table_name}
                            USING btree (CAST({col_name} AS {psql_type}))
                            WHERE project=%s and meta=%s"""
            ).format(
                index_name=sql.SQL(index_name),
                concurrent=sql.SQL(concurrent_str),
                table_name=sql.Identifier(table_name),
                col_name=sql.SQL(col_name),
                psql_type=sql.SQL(psql_type),
            )
            cursor.execute(sql_str, (project_id, entity_type_id))
        print(sql_str)


def make_native_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    make_btree_index(
        db_name,
        project_id,
        entity_type_id,
        table_name,
        index_name,
        attribute,
        "native",
        flush,
        concurrent,
    )


def make_bool_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    make_btree_index(
        db_name,
        project_id,
        entity_type_id,
        table_name,
        index_name,
        attribute,
        "boolean",
        flush,
        concurrent,
    )


def make_int_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    make_btree_index(
        db_name,
        project_id,
        entity_type_id,
        table_name,
        index_name,
        attribute,
        "bigint",
        flush,
        concurrent,
    )


def make_float_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    make_btree_index(
        db_name,
        project_id,
        entity_type_id,
        table_name,
        index_name,
        attribute,
        "float",
        flush,
        concurrent,
    )


def make_string_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    col_name = _get_column_name(attribute)
    method = "GIN"
    concurrent_str = ""
    if concurrent:
        concurrent_str = "CONCURRENTLY"
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(
                sql.SQL("DROP INDEX {concurrent} IF EXISTS {index_name}").format(
                    index_name=sql.SQL(index_name), concurrent=sql.SQL(concurrent_str)
                )
            )
        cursor.execute(
            "SELECT tablename,indexname,indexdef from pg_indexes where indexname = %s",
            (index_name,),
        )
        if bool(cursor.fetchall()):
            return
        col_name = _get_column_name(attribute)
        sql_str = sql.SQL(
            """CREATE INDEX {concurrent} {index_name} ON {table_name}
                                 USING {method} (CAST({col_name} AS text) {method}_trgm_ops)
                                 WHERE project=%s and meta=%s"""
        ).format(
            index_name=sql.SQL(index_name),
            concurrent=sql.SQL(concurrent_str),
            method=sql.SQL(method.lower()),
            table_name=sql.Identifier(table_name),
            col_name=sql.SQL(col_name),
        )
        cursor.execute(sql_str, (project_id, entity_type_id))
        print(sql_str.as_string(cursor))


def make_upper_string_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    col_name = _get_column_name(attribute)
    index_name += "_upper"
    method = "GIN"
    concurrent_str = ""
    if concurrent:
        concurrent_str = "CONCURRENTLY"
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(
                sql.SQL("DROP INDEX {concurrently} IF EXISTS {index_name}").format(
                    index_name=sql.SQL(index_name), concurrent=sql.SQL(concurrent_str)
                )
            )
        cursor.execute(
            "SELECT tablename,indexname,indexdef from pg_indexes where indexname = %s",
            (index_name,),
        )
        if bool(cursor.fetchall()):
            return
        col_name = _get_column_name(attribute)
        sql_str = sql.SQL(
            """CREATE INDEX {concurrent} {index_name} ON {table_name}
                                 USING {method} (UPPER(CAST({col_name} AS text)) {method}_trgm_ops)
                                 WHERE project=%s and meta=%s"""
        ).format(
            index_name=sql.SQL(index_name),
            method=sql.SQL(method.lower()),
            concurrent=sql.SQL(concurrent_str),
            table_name=sql.Identifier(table_name),
            col_name=sql.SQL(col_name),
        )
        cursor.execute(sql_str, (project_id, entity_type_id))
        print(sql_str.as_string(cursor))


def make_section_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    col_name = _get_column_name(attribute)
    method = "GIN"
    concurrent_str = ""
    if concurrent:
        concurrent_str = "CONCURRENTLY"
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(
                sql.SQL("DROP INDEX {concurrent} IF EXISTS {index_name}").format(
                    index_name=sql.SQL(index_name)
                )
            )
        cursor.execute(
            "SELECT tablename,indexname,indexdef from pg_indexes where indexname = %s",
            (index_name,),
        )
        if bool(cursor.fetchall()):
            return
        col_name = _get_column_name(attribute)
        sql_str = sql.SQL(
            """CREATE INDEX {concurrent} {index_name} ON {table_name}
                                 USING {method} (CAST({col_name} AS text) {method}_trgm_ops)
                                 WHERE project=%s"""
        ).format(
            index_name=sql.SQL(index_name),
            concurrent=sql.SQL(concurrent_str),
            method=sql.SQL(method.lower()),
            table_name=sql.Identifier(table_name),
            col_name=sql.SQL(col_name),
        )
        cursor.execute(sql_str, (project_id,))
        print(sql_str.as_string(cursor))


def make_native_string_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    col_name = _get_column_name(attribute)
    method = "GIN"
    concurrent_str = ""
    if concurrent:
        concurrent_str = "CONCURRENTLY"
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(
                sql.SQL("DROP INDEX {concurrent} IF EXISTS {index_name}").format(
                    index_name=sql.SQL(index_name), concurrent=sql.SQL(concurrent_str)
                )
            )
        cursor.execute(
            "SELECT tablename,indexname,indexdef from pg_indexes where indexname = %s",
            (index_name,),
        )
        if bool(cursor.fetchall()):
            return
        col_name = _get_column_name(attribute)
        sql_str = sql.SQL(
            """CREATE INDEX {concurrent} {index_name} ON {table_name}
                                 USING {method} ({col_name} {method}_trgm_ops)
                                 WHERE project=%s"""
        ).format(
            index_name=sql.SQL(index_name),
            concurrent=sql.SQL(concurrent_str),
            method=sql.SQL(method.lower()),
            table_name=sql.Identifier(table_name),
            col_name=sql.SQL(col_name),
        )
        cursor.execute(sql_str, (project_id,))
        print(sql_str.as_string(cursor))


def make_datetime_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    func_str = f"""CREATE OR REPLACE FUNCTION tator_timestamp(text)
                 RETURNS timestamp AS
                $func$
                SELECT CAST($1 as timestamp)
                $func$ LANGUAGE sql IMMUTABLE;"""
    col_name = _get_column_name(attribute)
    concurrent_str = ""
    if concurrent:
        concurrent_str = "CONCURRENTLY"
    sql_str = sql.SQL(
        """CREATE INDEX {concurrent} {index_name} ON {table_name} 
    USING btree (tator_timestamp({col_name})) WHERE project=%s AND meta=%s;"""
    ).format(
        index_name=sql.SQL(index_name),
        concurrent=sql.SQL(concurrent_str),
        table_name=sql.Identifier(table_name),
        col_name=sql.SQL(col_name),
    )
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(
                sql.SQL("DROP INDEX {concurrent} IF EXISTS {index_name}").format(
                    index_name=sql.SQL(index_name), concurrent=sql.SQL(concurrent_str)
                )
            )
        cursor.execute(
            "SELECT tablename,indexname,indexdef from pg_indexes where indexname = %s",
            (index_name,),
        )
        if bool(cursor.fetchall()):
            return
        cursor.execute(func_str)
        cursor.execute(sql_str, (project_id, entity_type_id))
        print(sql_str)


def make_geopos_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    concurrent_str = ""
    if concurrent:
        concurrent_str = "CONCURRENTLY"
    attr_name = re.sub(r"[^a-zA-Z0-9] ", "_", attribute["name"])
    sql_str = sql.SQL(
        """CREATE INDEX {concurrent} {index_name} ON {table_name} 
                         using gist(ST_MakePoint((attributes -> '{attr_name}' -> 1)::float, 
                         (attributes -> '{attr_name}' -> 0)::float)) WHERE project=%s and meta=%s;"""
    ).format(
        attr_name=sql.SQL(attr_name),
        concurrent=sql.SQL(concurrent_str),
        index_name=sql.Identifier(index_name),
        table_name=sql.Identifier(table_name),
    )
    with get_connection(db_name).cursor() as cursor:
        if flush:
            cursor.execute(
                sql.SQL("DROP INDEX {concurrent} IF EXISTS {index_name}").format(
                    index_name=sql.SQL(index_name), concurrent=sql.SQL(concurrent_str)
                )
            )
        cursor.execute(
            "SELECT tablename,indexname,indexdef from pg_indexes where indexname = %s",
            (index_name,),
        )
        if bool(cursor.fetchall()):
            return
        cursor.execute(sql_str, (project_id, entity_type_id))
        print(sql_str)


def make_vector_index(
    db_name, project_id, entity_type_id, table_name, index_name, attribute, flush, concurrent
):
    concurrent_str = ""
    if concurrent:
        concurrent_str = "CONCURRENTLY"
    with get_connection(db_name).cursor() as cursor:
        if flush:
            for method in ["l2", "ip", "cosine"]:
                cursor.execute(
                    sql.SQL("DROP INDEX {concurrent} IF EXISTS {index_name}_{method}").format(
                        index_name=sql.SQL(index_name),
                        method=sql.SQL(method),
                        concurrent=sql.SQL(concurrent_str),
                    )
                )
        # Create an index method for each access type
        attr_name = re.sub(r"[^a-zA-Z0-9] ", "_", attribute["name"])
        attr_size = int(attribute["size"])
        for method in ["l2", "ip", "cosine"]:
            unique_vector_name = f"{index_name}_{method}"
            cursor.execute(
                "SELECT tablename,indexname,indexdef from pg_indexes where indexname = %s",
                (unique_vector_name,),
            )
            if bool(cursor.fetchall()):
                continue
            sql_str = sql.SQL(
                """CREATE INDEX {concurrent} {index_name} ON {table_name} 
                                 using ivfflat(CAST(attributes ->> '{attr_name}' AS vector({attr_size})) 
                                                                   vector_{method}_ops) WHERE project=%s and meta=%s;"""
            ).format(
                attr_name=sql.SQL(attr_name),
                attr_size=sql.SQL(f"{attr_size}"),
                concurrent=sql.SQL(concurrent_str),
                index_name=sql.SQL(unique_vector_name),
                method=sql.SQL(method),
                table_name=sql.Identifier(table_name),
            )
            print(sql_str)
            cursor.execute(sql_str, (project_id, entity_type_id))
            print(sql_str)


def delete_psql_index(db_name, index_name):
    with get_connection(db_name).cursor() as cursor:
        cursor.execute(
            sql.SQL("DROP INDEX CONCURRENTLY IF EXISTS {index_name}").format(
                index_name=sql.SQL(index_name)
            )
        )


class TatorSearch:
    """Interface for managing psql indices
    There is one index per attribute type.
    """

    index_map = {
        "bool": make_bool_index,
        "int": make_int_index,
        "float": make_float_index,
        "enum": make_string_index,
        "string": make_string_index,
        "datetime": make_datetime_index,
        "geopos": make_geopos_index,
        "float_array": make_vector_index,
        "native": make_native_index,
        "native_string": make_native_string_index,
        "section": make_section_index,
        "upper_string": make_upper_string_index,
    }

    def list_indices(self, project):
        """Based on a project id, list all known indices"""
        with get_connection(connection.settings_dict["NAME"]).cursor() as cursor:
            cursor.execute(
                "SELECT tablename,indexname,indexdef from pg_indexes where indexname LIKE '{}'".format(
                    f"tator_proj_{project}_%"
                )
            )
            return cursor.fetchall()

    def delete_project_indices(self, project):
        """Delete all indices synchronously"""
        proj_indices = self.list_indices(project)
        for _, index_name, _ in proj_indices:
            push_job(
                "db_jobs", delete_psql_index, args=(connection.settings_dict["NAME"], index_name)
            )

    def delete_index(self, entity_type, attribute):
        """Delete the index for a given entity type"""
        index_name = _get_unique_index_name(entity_type, attribute)
        push_job(
            "db_jobs",
            delete_psql_index,
            args=(connection.settings_dict["NAME"], index_name),
            result_ttl=0,
        )

    def is_index_present(self, entity_type, attribute):
        """Returns true if the index exists for this attribute"""
        index_name = _get_unique_index_name(entity_type, attribute)
        with get_connection(connection.settings_dict["NAME"]).cursor() as cursor:
            if attribute["dtype"] == "float_array":
                cursor.execute(
                    "SELECT tablename,indexname,indexdef from pg_indexes where indexname LIKE '{}%'".format(
                        index_name
                    )
                )
                result = cursor.fetchall()
                return bool(result)
            else:
                cursor.execute(
                    "SELECT tablename,indexname,indexdef from pg_indexes where indexname = '{}'".format(
                        index_name
                    )
                )
                result = cursor.fetchall()
                return bool(result)

    def create_psql_index(self, entity_type, attribute, flush=False, concurrent=True):
        """Create a psql index for the given attribute"""
        index_name = _get_unique_index_name(entity_type, attribute)
        if self.is_index_present(entity_type, attribute) and flush == False:
            logger.info(f"Index '{index_name}' already exists.")
            return False

        index_func = self.index_map.get(attribute["dtype"], None)
        if index_func is None:
            logger.info(
                f"Index '{index_name}' can't be created with unknown dtype {attribute['dtype']}"
            )
            return False

        table_name = entity_type._meta.db_table.replace("type", "")
        index_name = _get_unique_index_name(entity_type, attribute)
        push_job(
            "db_jobs",
            index_func,
            args=(
                connection.settings_dict["NAME"],
                entity_type.project.id,
                entity_type.id,
                table_name,
                index_name,
                attribute,
                flush,
                concurrent,
            ),
            result_ttl=0,
        )

    def create_mapping(self, entity_type, flush=False, concurrent=True):
        from .models import BUILT_IN_INDICES

        # Add project specific indices based on the type being indexed
        built_ins = BUILT_IN_INDICES.get(type(entity_type), [])
        for built_in in built_ins:
            self.create_psql_index(entity_type, built_in, flush=flush, concurrent=concurrent)

        for attribute in entity_type.attribute_types:
            self.create_psql_index(entity_type, attribute, flush=flush, concurrent=concurrent)

    def rename_alias(self, entity_type, old_name, new_name):
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
        for idx, attribute_obj in enumerate(entity_type.attribute_types):
            if attribute_obj["name"] == old_name:
                found_idx = idx
                element = {**attribute_obj}
        if element is None:
            logger.error(f"Couldn't find {old_name} in {entity_type.name}")
            return []

        self.delete_index(entity_type, element)
        element["name"] = new_name
        entity_type.attribute_types[found_idx]["name"] = new_name
        self.create_psql_index(entity_type, element)

        return [entity_type]

    @staticmethod
    def validate_name(name):
        if not re.match("^[A-Za-z0-9_\s\->]+$", name):
            raise ValueError(
                f"Name '{name}' is not valid; it must only contain spaces, hyphens, underscores, "
                f"or alphanumeric characters"
            )

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
            if attribute_obj["name"] == old_name:
                element = {**attribute_obj}

        element["name"] = new_name

        if self.is_index_present(entity_type, element) is True:
            raise (
                f"Index already exists with the specified name. ID={entity_type.id} {old_name}->{new_name}"
            )

        # Validate the new name
        self.validate_name(new_name)

    def check_mutation(self, entity_type, name, attribute_type_update):
        """
        Checks mutation operation and raises if it is invalid. See `mutate_alias` for argument
        description.
        """
        found_it = False
        # Find old attribute type and create new attribute type.
        for idx, attribute_type in enumerate(entity_type.attribute_types):
            if attribute_type["name"] == name:
                replace_idx = idx
                old_dtype = attribute_type["dtype"]
                old_mapping_name = attribute_type["name"]
                found_it = True
                break

        if found_it != True:
            raise ValueError(
                f"Could not find attribute name {name} in entity type "
                f"{type(entity_type).__name__} ID {entity_type.id}"
            )

        new_dtype = attribute_type_update["dtype"]
        if new_dtype not in ALLOWED_MUTATIONS[old_dtype]:
            raise RuntimeError(
                f"Attempted mutation of {name} from {old_dtype} to {new_dtype} is " "not allowed!"
            )

    def mutate_alias(self, entity_type, name, attribute_type_update, mod_type, new_style=None):
        """
        Sets alias to new mapping type.

        :param entity_type: *Type object. Should be passed in before updating attribute_type json.
                            Field attribute_types will be updated with new dtype and style. Entity
                            type will not be saved.
        :param name: Name of attribute type being mutated.
        :param attribute_type_update: New attribute type for the attribute being mutated.
        :param mod_type: The type of modification to perform on the attribute: `update` will add
                         missing keys and update values of existing keys; `replace` will replace the
                         definition with `attribute_type_update`, which will result in deletion of
                         existing keys if they are not present in the new definition.
        :param new_style: [Optional] New display style of attribute type. Used to determine if
                          string attributes should be indexed as keyword or text.
        :returns: Entity type with updated attribute_types.
        """
        element = None
        el_idx = -1
        for idx, attribute_obj in enumerate(entity_type.attribute_types):
            if attribute_obj["name"] == name:
                element = {**attribute_obj}
                el_idx = idx
        if element is None:
            names = [a["name"] for a in entity_type.attribute_types]
            raise (Exception(f"Couldn't find {name} in {entity_type.name} {names}"))

        if element["dtype"] != attribute_type_update["dtype"]:
            self.create_psql_index(entity_type, attribute_type_update, True)

        # Update DB record for dtype and return it
        if mod_type == "update":
            entity_type.attribute_types[el_idx].update(attribute_type_update)
        elif mod_type == "replace":
            entity_type.attribute_types[el_idx] = attribute_type_update
        return entity_type

    def delete_alias(self, entity_type, name):
        """
        Deletes existing alias.

        :param entity_type: *Type object.
        :param name: Name of attribute type being deleted.
        :returns: Entity type with updated attribute_types.
        """
        element = None
        for idx, attribute_obj in enumerate(entity_type.attribute_types):
            if attribute_obj["name"] == name:
                element = {**attribute_obj}
                found_idx = idx
        if element is None:
            raise (f"Could not find attribute name {name} in entity type {entity_type.name}")
        self.delete_index(entity_type, element)
        del entity_type.attribute_types[found_idx]
        return entity_type
