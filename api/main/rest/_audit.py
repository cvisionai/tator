import os

import requests
from django.http import QueryDict

HOST = 'http://audit-svc'

def create_record(request):
    if os.getenv('AUDIT_ENABLED'):
        r = requests.post(f"{HOST}/rest", json={
            "method": request.method,
            "uri": request.path,
            "query": QueryDict(request.META['QUERY_STRING']),
            "headers": request.headers,
            "body": request.data,
            "user": request.user.id,
        })
        if(r.status_code != 200):
            raise RuntimeError("Failed to create audit record!")
        return r.json()

def update_record(record, response, duration):
    if os.getenv('AUDIT_ENABLED'):
        r = requests.patch(f"{HOST}/rest/{record_id}", json={
            "response": response.content,
            "status": response.status_code,
            "duration": duration,
        })
        if(r.status_code != 200):
            raise RuntimeError("Failed to update audit record!")
        return r.json()
