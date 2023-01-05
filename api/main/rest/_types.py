from ._util import bulk_delete_and_log_changes


def delete_instances(inst_type, inst_model, user, es_query_type):
    """
    Deletes the instances associated with their type.
    """

    project_id = inst_type.project.id
    inst_qs = inst_model.objects.filter(type=inst_type.id)
    count = inst_qs.count()

    if count:
        bulk_delete_and_log_changes(inst_qs, inst_type.project, user)

    return count
