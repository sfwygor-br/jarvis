from django.urls import path
from .views import ConversationListCreateView, RecordingListCreateView, ConfigListView

urlpatterns = [
    path('conversations/', ConversationListCreateView.as_view(), name='conversations'),
    path('recordings/', RecordingListCreateView.as_view(), name='recordings'),
    path('settings/', ConfigListView.as_view(), name='settings'),
]
