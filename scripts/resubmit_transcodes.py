import subprocess
import argparse
import logging
import sys
from textwrap import dedent
from urllib.parse import urlparse

import json
import yaml
import tator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler(sys.stdout))

def parse_args():
    parser = argparse.ArgumentParser(description=dedent('''\
    Resubmits failed or errored workflows.

    Examples:
    Resubmit workflows from last day.
    python3 resubmit_transcodes.py

    Resubmit workflows from the last hour.
    python3 resubmit_transcodes.py --since 1h

    Resubmit specific workflows by name.
    python3 resubmit_transcodes.py --workflows transcode-a transcode-b
    '''), formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument('--since', help='String specifying max time since workflow was '
                                        'submitted (1d, 1h, etc).', default='1d')
    parser.add_argument('--workflows', help='Specific list of workflow names.', nargs='+')
    return parser.parse_args()

def find_workflows(since=None):
    cmd = ['argo', 'list',
           '--prefix', 'transcode',
           '--status', 'Error,Failed']
    if since is not None:
        cmd += ['--since', since]
    return subprocess.run(cmd, capture_output=True)

def get_workflow(name):
    cmd = ['kubectl', 'get', 'workflow', name, '-o', 'yaml']
    result = subprocess.run(cmd, capture_output=True)
    return yaml.safe_load(result.stdout)

def get_params(desc):
    for template in desc['spec']['templates']:
      if template['name'] == 'single-file-pipeline':
        for task in template['dag']['tasks']:
          if task['name'] == 'download-task':
            for param in task['arguments']['parameters']:
              if param['name'] == 'url':
                path = urlparse(param['value']).path
                path = '/'.join(path.split('/')[-4:])
              elif param['name'] == 'entity_type':
                type_id = int(param['value'])
    params = desc['spec']['arguments']['parameters']
    params = {param['name']: param['value'] for param in params}
    params['path'] = path
    params['type_id'] = type_id
    return params

if __name__ == '__main__':
    args = parse_args()
    if args.workflows is None:
        workflows = find_workflows(args.since)
    else:
        workflows = args.workflows

    for workflow in workflows:
        desc = get_workflow(workflow)
        params = get_params(desc)
        api = tator.get_api(host=params['host'], token=params['token'])
        url = api.get_download_info(int(params['project']), {'keys': [params['path']]})[0].url
        response = tator.util.import_media(api, params['type_id'], url,
                                           section=params['section'],
                                           fname=params['upload_name'],
                                           upload_gid=params['gid'],
                                           upload_uid=params['uid'],
                                           attributes=json.loads(params['attributes']))
        logger.info(response.message)
        
