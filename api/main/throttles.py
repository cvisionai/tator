from rest_framework.throttling import UserRateThrottle


class BurstableThrottle(UserRateThrottle):
    rate = "100/second"

    def apply_monkey_patching_for_test():
        def _allow_request(self, request, view):
            return True

        BurstableThrottle.allow_request = _allow_request
