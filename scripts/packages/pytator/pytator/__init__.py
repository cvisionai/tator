"""
Tator Python Bindings REST API
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

"""
# Hack for RTD to work
try:
    from .tator import Tator
    from .tator import Auth
except:
    pass
from .version import __version__ as __version__

