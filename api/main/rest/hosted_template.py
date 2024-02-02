import jinja2
import requests

def get_template(ht, reg):
    headers = {**ht.headers, **reg.headers}
    tparams = {**ht.tparams, **reg.tparams}
    response = requests.get(ht.url, headers=headers)
    template = jinja2.Template(response.text)
    rendered_string = template.render(tparams)
    return rendered_string


