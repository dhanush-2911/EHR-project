from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AccessGrant
from users.models import Doctor
from patients.models import Patient

class AccessGrantSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    hospital_name = serializers.CharField(source='doctor.hospital.name', read_only=True)
    
    class Meta:
        model = AccessGrant
        fields = '__all__'

from users.permissions import IsDoctorOrPatient

class ConsentViewSet(viewsets.ModelViewSet):
    queryset = AccessGrant.objects.all().order_by('-request_date')
    serializer_class = AccessGrantSerializer
    permission_classes = [IsDoctorOrPatient]

    def get_queryset(self):
        qs = super().get_queryset()
        patient_id = self.request.query_params.get('patient_id')
        doctor_id = self.request.query_params.get('doctor_id')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if doctor_id:
            qs = qs.filter(doctor__source_id=doctor_id)
        
        # Security check: patients only see their own, doctors only see their own
        if self.request.user.role == 'patient':
            qs = qs.filter(patient__user=self.request.user)
        elif self.request.user.role == 'doctor':
            qs = qs.filter(doctor__user=self.request.user)
            
        return qs

    from users.permissions import IsPatient, IsDoctor

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role != 'patient':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only patients can approve requests.")
            
        grant = self.get_object()
        from django.utils import timezone
        from datetime import timedelta
        grant.status = 'approved'
        grant.approval_date = timezone.now()
        grant.expiry_date = timezone.now() + timedelta(days=30)
        
        approved_scope = request.data.get('scope', grant.scope)
        grant.scope = approved_scope
        grant.save()
        
        from audit.models import AuditLog
        AuditLog.objects.create(
            action='PATIENT_ACCESS_APPROVED',
            patient=grant.patient,
            doctor=grant.doctor,
            hospital=grant.doctor.hospital,
            purpose=grant.purpose
        )
        
        from users.models import Notification
        if grant.doctor.user:
            Notification.objects.create(
                recipient=grant.doctor.user,
                type='CONSENT_GRANTED',
                message=f"Patient {grant.patient.first_name} {grant.patient.last_name} approved your access request."
            )
            
        return Response({'status': 'approved'})
        
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role != 'patient':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only patients can reject requests.")
            
        grant = self.get_object()
        grant.status = 'rejected'
        grant.save()
        
        from audit.models import AuditLog
        AuditLog.objects.create(
            action='PATIENT_ACCESS_REJECTED',
            patient=grant.patient,
            doctor=grant.doctor,
            hospital=grant.doctor.hospital,
            purpose=grant.purpose
        )
        
        from users.models import Notification
        if grant.doctor.user:
            Notification.objects.create(
                recipient=grant.doctor.user,
                type='CONSENT_REJECTED',
                message=f"Patient {grant.patient.first_name} {grant.patient.last_name} denied your access request."
            )
            
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        if request.user.role != 'patient':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only patients can revoke requests.")
            
        grant = self.get_object()
        grant.status = 'revoked'
        grant.save()
        
        from audit.models import AuditLog
        AuditLog.objects.create(
            action='PATIENT_ACCESS_REVOKED',
            patient=grant.patient,
            doctor=grant.doctor,
            hospital=grant.doctor.hospital,
            purpose=grant.purpose
        )
        
        from users.models import Notification
        if grant.doctor.user:
            Notification.objects.create(
                recipient=grant.doctor.user,
                type='CONSENT_REVOKED',
                message=f"Patient {grant.patient.first_name} {grant.patient.last_name} revoked your access."
            )
            
        return Response({'status': 'revoked'})
        
    @action(detail=False, methods=['post'])
    def request_access(self, request):
        if request.user.role != 'doctor':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only doctors can request access.")
            
        patient_id = request.data.get('patient_id')
        doctor_source_id = request.data.get('doctor_id')
        purpose = request.data.get('purpose', 'Clinical consultation')
        scope = request.data.get('scope', ['full'])
        is_break_glass = request.data.get('is_break_glass', False)
        
        patient = Patient.objects.get(id=patient_id)
        doctor = Doctor.objects.get(source_id=doctor_source_id)
        
        if is_break_glass:
            justification = request.data.get('justification')
            if not justification or not str(justification).strip():
                from rest_framework import status
                return Response({'error': 'Break-glass access requires a justification.'}, status=status.HTTP_400_BAD_REQUEST)
                
            from django.utils import timezone
            from datetime import timedelta
            grant = AccessGrant.objects.create(
                patient=patient,
                doctor=doctor,
                status='approved',
                scope=scope,
                purpose=purpose,
                is_break_glass=True,
                justification=justification,
                approval_date=timezone.now(),
                expiry_date=timezone.now() + timedelta(hours=24)
            )
            from audit.models import AuditLog
            AuditLog.objects.create(
                action='BREAK_GLASS_ACCESS',
                patient=patient,
                doctor=doctor,
                hospital=doctor.hospital,
                purpose=purpose,
                metadata={'justification': grant.justification}
            )
            from users.models import Notification
            if patient.user:
                Notification.objects.create(
                    recipient=patient.user,
                    type='BREAK_GLASS_ACCESS',
                    message=f"EMERGENCY: Doctor {doctor.name} accessed your records using Break-Glass procedure. Reason: {justification}"
                )
                
            return Response(AccessGrantSerializer(grant).data)
        
        grant = AccessGrant.objects.filter(patient=patient, doctor=doctor).order_by('-request_date').first()
        
        if grant and grant.status == 'pending':
            # Update existing pending request
            grant.scope = scope
            grant.purpose = purpose
            grant.save()
        else:
            # Create a new request
            grant = AccessGrant.objects.create(
                patient=patient,
                doctor=doctor,
                status='pending',
                scope=scope,
                purpose=purpose
            )
            
        from audit.models import AuditLog
        AuditLog.objects.create(
            action='PATIENT_ACCESS_REQUESTED',
            patient=patient,
            doctor=doctor,
            hospital=doctor.hospital,
            purpose=purpose
        )
        
        from users.models import Notification
        if patient.user:
            Notification.objects.create(
                recipient=patient.user,
                type='CONSENT_REQUESTED',
                message=f"Doctor {doctor.name} requested access to your medical records for: {purpose}."
            )
            
        return Response(AccessGrantSerializer(grant).data)
