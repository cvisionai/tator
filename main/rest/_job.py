""" Utilities for job endpoints. """

import logging

logger = logging.getLogger(__name__)

def node_to_job_node(node):
    job_node = {}
    job_node['id'] = node['id']
    job_node['children'] = []
    if 'children' in node:
        job_node['children'] = list(node['children'])
    job_node['task'] = node['templateName']
    job_node['status'] = node['phase']
    if 'startedAt' in node:
        job_node['start_time'] = node['startedAt']
    if 'finishedAt' in node:
        job_node['stop_time'] = node['finishedAt']
    return job_node

def workflow_to_job(workflow):
    logger.info(f"WORKFLOW KEYS: {workflow.keys()}")
    logger.info(f"WORKFLOW METADATA KEYS: {workflow['metadata'].keys()}")
    import json
    logger.info(f"FULL WORKFLOW: {json.dumps(workflow, indent=4)}")
    job = {}
    job['id'] = workflow['metadata']['name']
    job['uid'] = workflow['metadata']['labels']['uid']
    job['gid'] = workflow['metadata']['labels']['gid']
    job['project'] = workflow['metadata']['labels']['project']
    job['user'] = workflow['metadata']['labels']['user']
    status = workflow['status']
    job['status'] = status['phase']
    if 'startedAt' in status:
        job['start_time'] = status['startedAt']
    if 'finishedAt' in status:
        job['stop_time'] = status['finishedAt']
    job['nodes'] = [node_to_job_node(status['nodes'][node_id])
                    for node_id in status['nodes']]
    return job

