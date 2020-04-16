# Pytator Unit Tests

## Running the tests

```
pytest --url <rest_url> --token <rest_token>
```

## Adding a test

1.) If a new component, create a new file in `/test` called `test_<comp>.py`

2.) In `test_<comp>.py` define a test function like so:

```
def test_<name>(<fixtures...>):
   <code>
```

where `<fixtures...>` is one of the elements defined in `conftest.py`
