
import os
import django
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from consent.models import AccessGrant
from users.models import Doctor
from patients.models import Patient

try:
    doc = Doctor.objects.get(source_id='prov1')
    pat = Patient.objects.get(source_id='1234')
    AccessGrant.objects.create(
        doctor=doc,
        patient=pat,
        status='approved',
        scope='full',
        expiry_date=timezone.now() + timedelta(days=30)
    )
    print('Consent seeded.')
except Exception as e:
    print('Error:', e)

