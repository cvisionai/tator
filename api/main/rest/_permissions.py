import os

if os.getenv("TATOR_FINE_GRAIN_PERMISSION", None) == "ENABLED":
    from ._fine_grain_permissions import *
else:
    from ._legacy_permissions import *
