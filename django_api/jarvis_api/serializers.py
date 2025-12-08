from rest_framework import serializers
from .models import Conversation, Recording, Config


class RecordingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recording
        fields = [
            'id',
            'conversation',
            'file_path',
            'started_at',
            'ended_at',
            'duration',
            'format',
            'sample_rate',
            'channels',
            'created_at',
        ]


class ConversationSerializer(serializers.ModelSerializer):
    recordings = RecordingSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id',
            'created_at',
            'updated_at',
            'user_input',
            'assistant_response',
            'extras',
            'metadata',
            'recordings',
        ]


class ConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = Config
        fields = ['id', 'key', 'value', 'description']
