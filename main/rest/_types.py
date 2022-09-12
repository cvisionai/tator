from ..search import TatorSearch

from ._annotation_query import get_annotation_es_query
from ._leaf_query import get_leaf_es_query
from ._file_query import get_file_es_query
from ._media_query import get_media_es_query
from ._util import bulk_delete_and_log_changes


def delete_instances(inst_type, inst_model, user, es_query_type):
    """
    Deletes the instances associated with their type.
    """

    project_id = inst_type.project.id
    inst_qs = inst_model.objects.filter(meta=inst_type.id)
    count = inst_qs.count()

    if count:
        bulk_delete_and_log_changes(inst_qs, inst_type.project, user)
        if es_query_type in ["state", "localization"]:
            params = {"ids": list(inst_qs.values_list("id", flat=True))}
            query = get_annotation_es_query(project_id, params, es_query_type)
        elif es_query_type == "media":
            params = {"media_id": list(inst_qs.values_list("id", flat=True))}
            query = get_media_es_query(project_id, params)
        elif es_query_type == "file":
            params = {"file_id": list(inst_qs.values_list("id", flat=True))}
            query = get_file_es_query(params)
        elif es_query_type == "leaf":
            params = {"leaf_id": list(inst_qs.values_list("id", flat=True))}
            query = get_leaf_es_query(params)
        else:
            raise ValueError(
                f"Got unsupported instance type '{es_query_type}', expected one of: "
                f"'media', 'file', 'leaf', 'localization', or 'state'"
            )
        TatorSearch().delete(project_id, query)

    return count
