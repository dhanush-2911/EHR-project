from django.db import models
from patients.models import Patient
from users.models import Doctor, Hospital
import uuid

class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    action = models.CharField(max_length=255) # e.g., PATIENT_RECORD_VIEWED, PATIENT_ACCESS_APPROVED
    resource = models.CharField(max_length=255, null=True, blank=True) # e.g., Lab Reports, Prescription
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, null=True, blank=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True)
    hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True)
    
    purpose = models.TextField(null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("AuditLog records cannot be modified after creation.")
        super().save(*args, **kwargs)
        
    def delete(self, *args, **kwargs):
        raise ValueError("AuditLog records cannot be deleted.")

    def __str__(self):
        return f"{self.timestamp} - {self.action}"

    class Meta:
        ordering = ['-timestamp']
