from ._common import go_to_uri

def test_annotation(browser, project, video):
    go_to_uri(browser, f"{project}/annotation/{video}")
