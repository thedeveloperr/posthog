from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import viewsets, request, authentication
from posthog.models import User, Element, Event
from django.db.models import Exists, OuterRef
from .base import TemporaryTokenAuthentication

import json

class ElementViewSet(viewsets.ModelViewSet):
    queryset = Element.objects.all()
    authentication_classes = [TemporaryTokenAuthentication, authentication.SessionAuthentication, authentication.BasicAuthentication]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(event__team=self.request.user.team_set.get())

    @action(methods=['POST'], detail=False)
    def volume(self, request: request):
        data = request.data
        volumes = {}
        for element_id, elements in data.items():
            events = Event.objects.filter(team=request.user.team_set.get())
            for index, element in enumerate(elements):
                events = events.filter(Exists(
                    Element.objects.filter(
                        event_id=OuterRef('pk'),
                        order=index,
                        **{key: value for key, value in element.items()}
                    )
                ))
            volumes[element_id] = events.count()
        return Response(volumes)