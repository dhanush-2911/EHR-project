from django.db import models
from users.models import User, Hospital
import uuid

class Patient(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    source_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=50, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    blood_group = models.CharField(max_length=10, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    
    primary_hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True)

import secrets
def generate_health_id():
    return secrets.token_hex(8).upper()

class PatientHealthID(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='health_id')
    health_id_str = models.CharField(max_length=16, default=generate_health_id, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
