from django.db import models


class Conversation(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user_input = models.TextField()
    assistant_response = models.TextField()
    extras = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Conversation {self.id} at {self.created_at:%Y-%m-%d %H:%M:%S}"


class Recording(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        related_name='recordings',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    file_path = models.CharField(max_length=512)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.FloatField(null=True, blank=True)
    format = models.CharField(max_length=32, default='wav')
    sample_rate = models.IntegerField(null=True, blank=True)
    channels = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_path


class Config(models.Model):
    key = models.CharField(max_length=128, unique=True)
    value = models.JSONField()
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.key
