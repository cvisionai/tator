import jinja2
import requests

def to_dict(param_list):
    return {p["name"]: p["value"] for p in param_list}


def get_and_render(ht, reg):
    headers = {**to_dict(ht.headers), **to_dict(reg.get("headers", []))}
    tparams = {**to_dict(ht.tparams), **to_dict(reg.get("tparams", []))}
    response = requests.get(ht.url, headers=headers)
    template = jinja2.Template(response.text)
    rendered_string = template.render(tparams)
    return rendered_string


