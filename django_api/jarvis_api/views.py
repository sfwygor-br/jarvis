from rest_framework import generics
from .models import Conversation, Recording, Config
from .serializers import ConversationSerializer, RecordingSerializer, ConfigSerializer


class ConversationListCreateView(generics.ListCreateAPIView):
    queryset = Conversation.objects.all().order_by('-created_at')
    serializer_class = ConversationSerializer


class RecordingListCreateView(generics.ListCreateAPIView):
    queryset = Recording.objects.all().order_by('-created_at')
    serializer_class = RecordingSerializer


class ConfigListView(generics.ListAPIView):
    queryset = Config.objects.all().order_by('key')
    serializer_class = ConfigSerializer
