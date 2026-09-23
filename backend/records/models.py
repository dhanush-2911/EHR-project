from django.db import models
from patients.models import Patient
from users.models import Doctor, Hospital
import uuid

class Encounter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='encounters')
    provider = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='encounters')
    hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True, related_name='encounters')
    
    encounter_type = models.CharField(max_length=255, null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    reason = models.TextField(null=True, blank=True)

class Condition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='conditions')
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True)
    
    code = models.CharField(max_length=100, null=True, blank=True)
    description = models.CharField(max_length=500)
    onset_date = models.DateField(null=True, blank=True)
    resolved_date = models.DateField(null=True, blank=True)

class AllergyRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='allergies')
    
    allergen = models.CharField(max_length=255)
    reaction = models.CharField(max_length=255, null=True, blank=True)
    severity = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=100, null=True, blank=True)

class Prescription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='prescriptions')
    provider = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True)
    hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True)
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True)
    
    medication_name = models.CharField(max_length=255)
    medication_code = models.CharField(max_length=100, null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    dosage = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=100, null=True, blank=True)

class Observation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='observations')
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True)
    
    date = models.DateTimeField(null=True, blank=True)
    test_name = models.CharField(max_length=255)
    value = models.CharField(max_length=255, null=True, blank=True)
    units = models.CharField(max_length=100, null=True, blank=True)
    reference_range = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=100, null=True, blank=True)

class Procedure(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='procedures')
    encounter = models.ForeignKey(Encounter, on_delete=models.SET_NULL, null=True, blank=True)
    
    date = models.DateTimeField(null=True, blank=True)
    code = models.CharField(max_length=100, null=True, blank=True)
    description = models.CharField(max_length=500)
    reason = models.TextField(null=True, blank=True)

class Referral(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='referrals')
    referring_doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='outgoing_referrals')
    specialist = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='incoming_referrals')
    specialty = models.CharField(max_length=255, null=True, blank=True)
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=100, default='pending') # pending, accepted, rejected, completed
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
