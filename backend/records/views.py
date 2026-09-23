from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import Encounter, Condition, AllergyRecord, Prescription, Observation, Procedure
from .serializers import EncounterSerializer, ConditionSerializer, AllergySerializer, PrescriptionSerializer, ObservationSerializer, ProcedureSerializer
from patients.models import Patient
from users.models import Doctor
from consent.models import AccessGrant
from django.utils import timezone

def check_consent(doctor_id, patient_id, resource_name):
    if not doctor_id:
        raise PermissionDenied("Patient access permission is required.")
    
    # In a real system, the doctor is derived from request.user
    doctor = get_object_or_404(Doctor, source_id=doctor_id)
    patient = get_object_or_404(Patient, id=patient_id)
    
    # Check if doctor has active grant
    grants = AccessGrant.objects.filter(doctor=doctor, patient=patient, status='approved')
    valid_grant = None
    expired_grant = None
    
    for grant in grants:
        if grant.is_active:
            valid_grant = grant
            break
        elif grant.expiry_date and grant.expiry_date < timezone.now():
            expired_grant = grant
            
    from audit.models import AuditLog
    if not valid_grant:
        if expired_grant:
            # If we found an expired grant but no active grant, log it as expired
            AuditLog.objects.create(
                action='PATIENT_ACCESS_EXPIRED',
                patient=patient,
                doctor=doctor,
                hospital=doctor.hospital,
                resource=resource_name,
                metadata={'grant_id': str(expired_grant.id)}
            )
        else:
            AuditLog.objects.create(
                action='PATIENT_RECORD_ACCESS_DENIED',
                patient=patient,
                doctor=doctor,
                hospital=doctor.hospital,
                resource=resource_name
            )
        raise PermissionDenied("Patient access permission is required.")

    # Scope check
    allowed = False
    
    # Handle string scopes that might have been saved incorrectly (e.g. "['full']")
    scope_list = valid_grant.scope
    if isinstance(scope_list, str):
        try:
            import json
            import ast
            # Safely evaluate if it's a string representation of a list
            if scope_list.startswith('['):
                scope_list = ast.literal_eval(scope_list)
            else:
                scope_list = [scope_list]
        except:
            scope_list = [scope_list]
            
    if 'full' in scope_list:
        allowed = True
    elif resource_name in scope_list:
        allowed = True
    elif resource_name == 'observations' and 'labs' in scope_list:
        allowed = True
        
    if not allowed:
        AuditLog.objects.create(
            action='PATIENT_RECORD_ACCESS_DENIED',
            patient=patient,
            doctor=doctor,
            hospital=doctor.hospital,
            resource=resource_name,
            metadata={"reason": "outside scope"}
        )
        raise PermissionDenied("Patient access permission is required.")

    # Log successful view
    AuditLog.objects.create(
        action='PATIENT_RECORD_VIEWED',
        patient=patient,
        doctor=doctor,
        hospital=doctor.hospital,
        resource=resource_name,
        purpose=valid_grant.purpose
    )

from users.permissions import IsDoctorOrPatient, IsDoctor

class PatientRecordViewSetMixin:
    permission_classes = [IsDoctorOrPatient]
    
    def get_queryset(self):
        patient_id = self.kwargs.get('patient_pk')
        doctor_id = self.request.query_params.get('doctor_id') or self.request.headers.get('X-Doctor-ID')
        patient_header = self.request.headers.get('X-Patient-ID')
        
        if patient_id:
            # If patient is fetching their own records, skip doctor check
            if patient_header and str(patient_header) == str(patient_id):
                return self.queryset.filter(patient_id=patient_id)
                
            check_consent(doctor_id, patient_id, getattr(self, 'resource_name', 'unknown'))
            return self.queryset.filter(patient_id=patient_id)
        return self.queryset.none()

class EncounterViewSet(PatientRecordViewSetMixin, viewsets.ReadOnlyModelViewSet):
    resource_name = 'encounters'
    queryset = Encounter.objects.all().order_by('-start_date')
    serializer_class = EncounterSerializer

class ConditionViewSet(PatientRecordViewSetMixin, viewsets.ReadOnlyModelViewSet):
    resource_name = 'conditions'
    queryset = Condition.objects.all().order_by('-onset_date')
    serializer_class = ConditionSerializer

class AllergyViewSet(PatientRecordViewSetMixin, viewsets.ReadOnlyModelViewSet):
    resource_name = 'allergies'
    queryset = AllergyRecord.objects.all()
    serializer_class = AllergySerializer

class PrescriptionViewSet(PatientRecordViewSetMixin, viewsets.ReadOnlyModelViewSet):
    resource_name = 'prescriptions'
    queryset = Prescription.objects.all().order_by('-start_date')
    serializer_class = PrescriptionSerializer

class ObservationViewSet(PatientRecordViewSetMixin, viewsets.ReadOnlyModelViewSet):
    resource_name = 'observations'
    queryset = Observation.objects.all().order_by('-date')
    serializer_class = ObservationSerializer

class ProcedureViewSet(PatientRecordViewSetMixin, viewsets.ReadOnlyModelViewSet):
    resource_name = 'procedures'
    queryset = Procedure.objects.all().order_by('-date')
    serializer_class = ProcedureSerializer

from rest_framework.views import APIView
import requests
import datetime

class PatientInsightsView(APIView):
    permission_classes = [IsDoctorOrPatient]

    def get(self, request, patient_pk):
        if request.user.role == 'doctor':
            doctor_id = request.user.doctor.source_id
            check_consent(doctor_id, patient_pk, 'insights')
        else:
            if str(request.user.patient.id) != str(patient_pk):
                raise PermissionDenied("You can only access your own insights.")
            
        patient = get_object_or_404(Patient, id=patient_pk)
        
        # Log AI insights viewed
        from audit.models import AuditLog
        AuditLog.objects.create(
            action='AI_INSIGHTS_VIEWED',
            patient=patient,
            doctor=request.user.doctor if request.user.role == 'doctor' else None,
            hospital=request.user.doctor.hospital if request.user.role == 'doctor' else None,
            resource='insights'
        )
        
        # Calculate age
        age = 40
        if patient.dob:
            age = (datetime.date.today() - patient.dob).days // 365
            
        # Collect data for AI Engine
        conditions = list(Condition.objects.filter(patient=patient).values_list('description', flat=True))
        meds = list(Prescription.objects.filter(patient=patient).values_list('medication_name', flat=True))
        obs_qs = Observation.objects.filter(patient=patient).order_by('-date')[:50]
        observations = [{"test_name": o.test_name, "value": o.value, "units": o.units, "date": str(o.date)} for o in obs_qs]
        allergies = list(AllergyRecord.objects.filter(patient=patient).values_list('substance', flat=True))
        
        payload = {
            "patient_age": age,
            "conditions": conditions,
            "medications": meds,
            "observations": observations,
            "allergies": allergies
        }
        
        try:
            resp = requests.post("http://localhost:8002/analyze/", json=payload, timeout=5)
            if resp.status_code == 200:
                return Response(resp.json())
        except Exception as e:
            pass
            
        return Response({"insights": [{"type": "ERROR", "category": "System", "message": "Failed to connect to AI Engine."}]})

class PatientTimelineView(APIView):
    permission_classes = [IsDoctorOrPatient]

    def get(self, request, patient_pk):
        allowed_scopes = ['full']
        
        if request.user.role == 'doctor':
            doctor_id = request.user.doctor.source_id
            doctor = get_object_or_404(Doctor, source_id=doctor_id)
            patient = get_object_or_404(Patient, id=patient_pk)
            
            grants = AccessGrant.objects.filter(doctor=doctor, patient=patient, status='approved')
            valid_grant = None
            for grant in grants:
                if grant.is_active:
                    valid_grant = grant
                    break
                    
            if not valid_grant:
                raise PermissionDenied("Patient access permission is required.")
                
            allowed_scopes = valid_grant.scope
            if isinstance(allowed_scopes, str):
                try:
                    import ast
                    if allowed_scopes.startswith('['):
                        allowed_scopes = ast.literal_eval(allowed_scopes)
                    else:
                        allowed_scopes = [allowed_scopes]
                except:
                    allowed_scopes = [allowed_scopes]
        else:
            # Check if patient is accessing their own timeline
            if str(request.user.patient.id) != str(patient_pk):
                raise PermissionDenied("You can only access your own timeline.")
            
        patient = get_object_or_404(Patient, id=patient_pk)
        timeline = []
        
        is_full = 'full' in allowed_scopes
        
        if is_full or 'encounters' in allowed_scopes:
            for e in Encounter.objects.filter(patient=patient):
                timeline.append({
                    'id': str(e.id),
                    'type': 'ENCOUNTER',
                    'date': e.start_date.isoformat() if e.start_date else None,
                    'title': e.encounter_type,
                    'description': e.reason or 'Routine encounter'
                })
                
        if is_full or 'conditions' in allowed_scopes:
            for c in Condition.objects.filter(patient=patient):
                timeline.append({
                    'id': str(c.id),
                    'type': 'CONDITION',
                    'date': c.onset_date.isoformat() if hasattr(c.onset_date, 'isoformat') else str(c.onset_date),
                    'title': 'Diagnosis',
                    'description': c.description
                })
                
        if is_full or 'prescriptions' in allowed_scopes:
            for p in Prescription.objects.filter(patient=patient):
                timeline.append({
                    'id': str(p.id),
                    'type': 'PRESCRIPTION',
                    'date': p.start_date.isoformat() if hasattr(p.start_date, 'isoformat') else str(p.start_date),
                    'title': 'Medication Prescribed',
                    'description': p.medication_name
                })
                
        if is_full or 'observations' in allowed_scopes or 'labs' in allowed_scopes:
            for o in Observation.objects.filter(patient=patient):
                timeline.append({
                    'id': str(o.id),
                    'type': 'LAB',
                    'date': o.date.isoformat() if hasattr(o.date, 'isoformat') else str(o.date),
                    'title': 'Lab Result',
                    'description': f"{o.test_name}: {o.value} {o.units}"
                })
                
        if is_full or 'procedures' in allowed_scopes:
            for p in Procedure.objects.filter(patient=patient):
                timeline.append({
                    'id': str(p.id),
                    'type': 'PROCEDURE',
                    'date': p.date.isoformat() if hasattr(p.date, 'isoformat') else str(p.date),
                    'title': 'Procedure',
                    'description': p.description
                })
                
        if is_full or 'allergies' in allowed_scopes:
            for a in AllergyRecord.objects.filter(patient=patient):
                timeline.append({
                    'id': str(a.id),
                    'type': 'ALLERGY',
                    'date': a.recorded_date.isoformat() if hasattr(a.recorded_date, 'isoformat') else str(a.recorded_date),
                    'title': 'Allergy',
                    'description': a.substance
                })
                
        # Filter out items with no date
        timeline = [item for item in timeline if item['date']]
        
        # Offload chronological sorting and medical summarization to AI engine
        try:
            resp = requests.post("http://localhost:8002/timeline/", json={"events": timeline}, timeout=5)
            if resp.status_code == 200:
                return Response(resp.json().get('timeline', timeline))
        except:
            pass
            
        # Fallback to local sort
        timeline.sort(key=lambda x: x['date'], reverse=True)
        return Response(timeline)

class PatientChatView(APIView):
    permission_classes = [IsDoctorOrPatient]

    def post(self, request, patient_pk):
        if request.user.role != 'patient':
            raise PermissionDenied("Only the patient can use their chat assistant.")
        if str(request.user.patient.id) != str(patient_pk):
            raise PermissionDenied("You can only access your own chat.")
            
        patient = get_object_or_404(Patient, id=patient_pk)
        
        # We can extract messages from the request
        messages = request.data.get('messages', [])
        
        payload = {
            "messages": messages,
            "patient_context": {
                "id": str(patient.id),
                "name": f"{patient.first_name} {patient.last_name}"
            }
        }
        
        try:
            resp = requests.post("http://localhost:8002/chat/", json=payload, timeout=10)
            if resp.status_code == 200:
                return Response(resp.json())
        except Exception as e:
            return Response({"reply": "I am currently unable to connect to the central AI server. Please try again later."}, status=503)
            
        return Response({"reply": "An error occurred with the AI Engine."}, status=500)

class DoctorDiagnosisView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, patient_pk):
        patient = get_object_or_404(Patient, id=patient_pk)
        doctor = request.user.doctor
        
        prompt = request.data.get('prompt', '').strip()
        if not prompt:
            return Response({"error": "Prompt or symptom description is required."}, status=400)
            
        # Calculate age
        age = 45
        if patient.dob:
            age = (datetime.date.today() - patient.dob).days // 365
            
        # Gather EHR records
        conditions = list(Condition.objects.filter(patient=patient).values_list('description', flat=True))
        meds = list(Prescription.objects.filter(patient=patient).values_list('medication_name', flat=True))
        allergies = list(AllergyRecord.objects.filter(patient=patient).values_list('allergen', flat=True))
        obs_qs = Observation.objects.filter(patient=patient).order_by('-date')[:50]
        observations = [{"test_name": o.test_name, "value": o.value, "units": o.units, "date": str(o.date)} for o in obs_qs]
        enc_qs = Encounter.objects.filter(patient=patient).order_by('-start_date')[:10]
        encounters = [{"type": e.encounter_type, "reason": e.reason, "date": str(e.start_date)} for e in enc_qs]
        
        payload = {
            "prompt": prompt,
            "patient_id": str(patient.id),
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "patient_age": age,
            "gender": patient.gender,
            "conditions": conditions,
            "medications": meds,
            "allergies": allergies,
            "observations": observations,
            "encounters": encounters
        }
        
        # Log audit trail
        from audit.models import AuditLog
        AuditLog.objects.create(
            action='AI_DIAGNOSIS_REQUESTED',
            patient=patient,
            doctor=doctor,
            hospital=doctor.hospital,
            resource='doctor_diagnostic_assistant'
        )
        
        try:
            resp = requests.post("http://localhost:8002/doctor-diagnose/", json=payload, timeout=12)
            if resp.status_code == 200:
                return Response(resp.json())
            return Response({"error": f"AI Engine returned status {resp.status_code}"}, status=502)
        except Exception as e:
            return Response({"error": "Failed to connect to AI Diagnostic Engine. Make sure AI Engine is running."}, status=503)

from records.models import Referral
from users.permissions import IsDoctor

class ReferralViewSet(viewsets.ViewSet):
    permission_classes = [IsDoctor]
    
    def create(self, request):
        patient_id = request.data.get('patient_id')
        specialist_id = request.data.get('specialist_id')
        reason = request.data.get('reason')
        specialty = request.data.get('specialty')
        
        patient = get_object_or_404(Patient, id=patient_id)
        specialist = get_object_or_404(Doctor, source_id=specialist_id)
        referring_doctor = request.user.doctor
        
        referral = Referral.objects.create(
            patient=patient,
            referring_doctor=referring_doctor,
            specialist=specialist,
            reason=reason,
            specialty=specialty
        )
        
        # Log event
        from audit.models import AuditLog
        AuditLog.objects.create(
            action='REFERRAL_CREATED',
            patient=patient,
            doctor=referring_doctor,
            hospital=referring_doctor.hospital,
            metadata={"specialist_id": str(specialist.source_id), "reason": reason}
        )
        
        # Auto-create access grant for the specialist
        from consent.models import AccessGrant
        AccessGrant.objects.create(
            patient=patient,
            doctor=specialist,
            scope=['full'],
            purpose=f"Referral from Dr. {referring_doctor.name} for {specialty or 'specialist consultation'}",
            status='approved',
            is_break_glass=False
        )
        
        # Notify specialist
        from users.models import Notification
        if specialist.user:
            Notification.objects.create(
                recipient=specialist.user,
                type='NEW_REFERRAL',
                message=f"You have received a new referral for patient {patient.first_name} {patient.last_name}."
            )
            
        return Response({'id': str(referral.id), 'status': 'pending'})
class OcrExtractionView(APIView):
    # Only doctors can upload documents for OCR
    permission_classes = [IsDoctor]
    
    def post(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "No file provided"}, status=400)
            
        file_obj = request.FILES['file']
        
        try:
            # Proxy the file upload to the AI engine
            files = {'file': (file_obj.name, file_obj.read(), file_obj.content_type)}
            resp = requests.post("http://localhost:8002/ocr/", files=files, timeout=15)
            if resp.status_code == 200:
                return Response(resp.json())
            return Response({"error": f"AI Engine returned {resp.status_code}"}, status=502)
        except Exception as e:
            return Response({"error": "Failed to connect to AI engine for OCR extraction"}, status=503)

class FhirPatientView(APIView):
    permission_classes = [IsDoctorOrPatient]
    
    def get(self, request, pk):
        patient = get_object_or_404(Patient, id=pk)
        
        # Enforce check_consent logic
        if request.user.role == 'doctor':
            doctor_id = request.user.doctor.source_id
            check_consent(doctor_id, pk, 'full')
        
        fhir_patient = {
            "resourceType": "Patient",
            "id": str(patient.id),
            "identifier": [
                {
                    "system": "http://hospital.org/fhir/patient-id",
                    "value": str(patient.source_id)
                }
            ],
            "name": [
                {
                    "family": patient.last_name,
                    "given": [patient.first_name]
                }
            ],
            "gender": patient.gender.lower() if patient.gender else "unknown",
            "birthDate": str(patient.dob) if patient.dob else None,
            "address": [
                {
                    "text": patient.address
                }
            ] if patient.address else []
        }
        
        return Response(fhir_patient)
