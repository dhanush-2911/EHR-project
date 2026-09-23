from django.db import models
from patients.models import Patient
from users.models import Doctor, Hospital
import uuid

class AccessGrant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='access_grants')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='access_grants')
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, null=True, blank=True)
    
    scope = models.JSONField(default=list) # e.g., ['medical_history', 'lab_reports']
    purpose = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=50, default='pending') # pending, approved, rejected, expired, revoked
    
    request_date = models.DateTimeField(auto_now_add=True)
    approval_date = models.DateTimeField(null=True, blank=True)
    expiry_date = models.DateTimeField(null=True, blank=True)
    
    is_break_glass = models.BooleanField(default=False)
    justification = models.TextField(null=True, blank=True)

    @property
    def is_active(self):
        from django.utils import timezone
        if self.status == 'approved' and self.expiry_date and self.expiry_date > timezone.now():
            return True
        return False
