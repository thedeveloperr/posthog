from rest_framework.pagination import CursorPagination as RestCursorPagination
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import request, authentication # type: ignore
from posthog.models import User

class CursorPagination(RestCursorPagination):
    ordering = '-created_at'
    page_size = 50

class TemporaryTokenAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request: request.Request):
        # if the Origin is different, the only authentication method should be temporary_token
        # This happens when someone is trying to create actions from the editor on their own website
        if request.headers.get('Origin') and request.headers['Origin'] not in request.build_absolute_uri('/'):
            if not request.GET.get('temporary_token'):
                raise AuthenticationFailed(detail='No token')
        if request.GET.get('temporary_token'):
            user = User.objects.filter(temporary_token=request.GET.get('temporary_token'))
            if not user.exists():
                raise AuthenticationFailed(detail='User doesnt exist')
            return (user.first(), None)
        return None