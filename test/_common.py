import os

def get_video_path(page):
    """ Gets a page with video name set to the current test.
    """
    dir_name = os.path.dirname(page.video.path())
    test_name = os.getenv('PYTEST_CURRENT_TEST')
    test_name = test_name.replace('/', '__').replace('.py::', '__').split('[')[0]
    file_name = f"{test_name}.webm"
    path = os.path.join(dir_name, file_name)
    return path

def print_page_error(err):
    print("--------------------------------")
    print("Got page error:")
    print(f"Message: {err.message}")
    print(f"Name: {err.name}")
    print(f"Stack: {err.stack}")
    print("--------------------------------")

