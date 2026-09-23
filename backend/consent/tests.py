from django.test import TestCase
from rest_framework.test import APIClient
from patients.models import Patient
from users.models import Doctor, Hospital
from consent.models import AccessGrant
from django.utils import timezone
from datetime import timedelta

class SecurityTests(TestCase):
    def setUp(self):
        from users.models import User
        self.user = User.objects.create(username='testdoc')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.hospital = Hospital.objects.create(name='Test Hospital')
        self.patient = Patient.objects.create(first_name='John', last_name='Doe')
        self.patient2 = Patient.objects.create(first_name='Jane', last_name='Smith')
        self.doctor = Doctor.objects.create(name='Dr. Smith', source_id='doc1', hospital=self.hospital)
        
    def test_1_search_without_access(self):
        response = self.client.get(f'/api/patients/{self.patient.id}/encounters/', HTTP_X_DOCTOR_ID='doc1')
        self.assertEqual(response.status_code, 403)
        
    def test_2_request_access(self):
        response = self.client.post('/api/consents/request/', {
            'patient_id': self.patient.id,
            'doctor_id': 'doc1',
            'purpose': 'Consultation',
            'scope': ['encounters', 'conditions']
        }, format='json')
        self.assertEqual(response.status_code, 200)
        grant = AccessGrant.objects.get(id=response.data['id'])
        self.assertEqual(grant.status, 'pending')
        
    def test_3_patient_rejects(self):
        grant = AccessGrant.objects.create(patient=self.patient, doctor=self.doctor, status='pending')
        self.client.post(f'/api/consents/{grant.id}/reject/')
        
        response = self.client.get(f'/api/patients/{self.patient.id}/encounters/', HTTP_X_DOCTOR_ID='doc1')
        self.assertEqual(response.status_code, 403)
        
    def test_4_patient_approves(self):
        grant = AccessGrant.objects.create(patient=self.patient, doctor=self.doctor, status='pending')
        self.client.post(f'/api/consents/{grant.id}/approve/')
        
        grant.refresh_from_db()
        self.assertEqual(grant.status, 'approved')
        self.assertIsNotNone(grant.expiry_date)
        
    def test_5_doctor_with_valid_grant(self):
        AccessGrant.objects.create(patient=self.patient, doctor=self.doctor, status='approved', scope=['full'], expiry_date=timezone.now() + timedelta(days=1))
        response = self.client.get(f'/api/patients/{self.patient.id}/encounters/', HTTP_X_DOCTOR_ID='doc1')
        self.assertEqual(response.status_code, 200)
        
    def test_6_doctor_accesses_outside_scope(self):
        AccessGrant.objects.create(patient=self.patient, doctor=self.doctor, status='approved', scope=['encounters'], expiry_date=timezone.now() + timedelta(days=1))
        response = self.client.get(f'/api/patients/{self.patient.id}/conditions/', HTTP_X_DOCTOR_ID='doc1')
        self.assertEqual(response.status_code, 403)
        
    def test_7_grant_expires(self):
        AccessGrant.objects.create(patient=self.patient, doctor=self.doctor, status='approved', scope=['full'], expiry_date=timezone.now() - timedelta(days=1))
        response = self.client.get(f'/api/patients/{self.patient.id}/encounters/', HTTP_X_DOCTOR_ID='doc1')
        self.assertEqual(response.status_code, 403)
        
    def test_8_patient_revokes_grant(self):
        grant = AccessGrant.objects.create(patient=self.patient, doctor=self.doctor, status='approved', scope=['full'], expiry_date=timezone.now() + timedelta(days=1))
        self.client.post(f'/api/consents/{grant.id}/revoke/')
        response = self.client.get(f'/api/patients/{self.patient.id}/encounters/', HTTP_X_DOCTOR_ID='doc1')
        self.assertEqual(response.status_code, 403)
        
    def test_9_doctor_tries_to_use_patient_a_grant_for_patient_b(self):
        AccessGrant.objects.create(patient=self.patient, doctor=self.doctor, status='approved', scope=['full'], expiry_date=timezone.now() + timedelta(days=1))
        response = self.client.get(f'/api/patients/{self.patient2.id}/encounters/', HTTP_X_DOCTOR_ID='doc1')
        self.assertEqual(response.status_code, 403)
        
    def test_11_break_glass_access(self):
        response = self.client.post('/api/consents/request/', {
            'patient_id': self.patient.id,
            'doctor_id': 'doc1',
            'is_break_glass': True,
            'justification': 'Patient is unconscious'
        }, format='json')
        self.assertEqual(response.status_code, 200)
        grant = AccessGrant.objects.get(id=response.data['id'])
        self.assertEqual(grant.status, 'approved')
        self.assertTrue(grant.is_break_glass)
        
        from audit.models import AuditLog
        self.assertTrue(AuditLog.objects.filter(action='BREAK_GLASS_ACCESS').exists())
