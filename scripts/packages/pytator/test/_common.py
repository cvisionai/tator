import json

def is_number(x):
    try:
        float(x)
        return True
    except:
        return False

def print_fail(a, b, key):
    print(f"Failed on key: {key}")
    print(f"a: {json.dumps(a, indent=4)}")
    print(f"b: {json.dumps(b, indent=4)}")

def assert_close_enough(a, b, exclude):
    for key in a:
        if key in exclude:
            continue
        if key not in b:
            print_fail(a, b, key)
        assert key in b
        if is_number(a[key]):
            diff = abs(a[key] - b[key])
            if diff > 0.0001:
                print_fail(a, b, key)
            assert diff < 0.0001
        else:
            if a[key] != b[key]:
                print_fail(a, b, key)
            assert a[key] == b[key]

