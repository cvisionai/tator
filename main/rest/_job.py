""" Utilities for job endpoints. """

def node_to_job_node(node):
    job_node = {}
    job_node['id'] = node['Id']
    job_node['children'] = list(node['Children'])
    job_node['task'] = node['Template Name']
    job_node['status'] = node['Phase']
    if 'Started At' in node:
        job_node['start_time'] = node['Started At']
    if 'Finished At' in node:
        job_node['stop_time'] = node['Finished At']
    return job_node

def workflow_to_job(workflow):
    job = {}
    job['id'] = workflow['Name']
    status = workflow['Status']
    job['status'] = status['Phase']
    if 'Started At' in status:
        job['start_time'] = status['Started At']
    if 'Finished At' in status:
        job['stop_time'] = status['Finished At']
    job['nodes'] = [node_to_job_node(status['Nodes'][node_id])
                    for node_id in status['Nodes']]
    return job

