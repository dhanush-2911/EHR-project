import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from users.models import User, Doctor
from patients.models import Patient

@pytest.mark.django_db
def test_doctor_cannot_approve_consent():
    client = APIClient()
    doctor_user = User.objects.create_user(username='doc', password='pw', role='doctor')
    Doctor.objects.create(user=doctor_user, name='Dr. Smith')
    client.force_authenticate(user=doctor_user)
    response = client.post('/api/consents/1234/approve/')
    assert response.status_code == 403

@pytest.mark.django_db
def test_patient_cannot_request_consent():
    client = APIClient()
    pt_user = User.objects.create_user(username='pt', password='pw', role='patient')
    Patient.objects.create(user=pt_user, first_name='John', last_name='Doe')
    client.force_authenticate(user=pt_user)
    response = client.post('/api/consents/request/', {'patient_id': '123'})
    assert response.status_code == 403
