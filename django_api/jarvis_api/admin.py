from django.contrib import admin
from .models import Conversation, Recording, Config


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'user_input')
    search_fields = ('user_input', 'assistant_response')
    list_filter = ('created_at',)


@admin.register(Recording)
class RecordingAdmin(admin.ModelAdmin):
    list_display = ('id', 'file_path', 'conversation', 'created_at')
    search_fields = ('file_path',)
    list_filter = ('created_at',)


@admin.register(Config)
class ConfigAdmin(admin.ModelAdmin):
    list_display = ('id', 'key', 'description')
    search_fields = ('key',)
