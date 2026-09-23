from rest_framework import viewsets
from .models import Patient
from .serializers import PatientSerializer

from users.permissions import IsDoctorOrPatient

class PatientViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [IsDoctorOrPatient]

    def get_queryset(self):
        if self.request.user.role == 'patient':
            return self.queryset.filter(user=self.request.user)
        return self.queryset

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import PatientHealthID
from users.permissions import IsDoctor

@api_view(['POST'])
@permission_classes([IsDoctor])
def resolve_health_id(request):
    health_id_str = request.data.get('health_id')
    if not health_id_str:
        return Response({"error": "health_id is required"}, status=400)
        
    try:
        health_id_obj = PatientHealthID.objects.get(health_id_str=health_id_str)
        patient = health_id_obj.patient
        
        from audit.models import AuditLog
        AuditLog.objects.create(
            action='HEALTH_ID_SCANNED',
            patient=patient,
            doctor=request.user.doctor if hasattr(request.user, 'doctor') else None,
            hospital=request.user.doctor.hospital if hasattr(request.user, 'doctor') else None,
            metadata={"health_id_str": health_id_str}
        )
        
        return Response({
            "patient_id": str(patient.id),
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "gender": patient.gender,
            "dob": str(patient.dob)
        })
    except PatientHealthID.DoesNotExist:
        return Response({"error": "Invalid Health ID"}, status=404)

import qrcode
from io import BytesIO
from django.http import HttpResponse
from users.permissions import IsPatient

@api_view(['GET'])
@permission_classes([IsPatient])
def get_health_id_qr(request):
    patient = request.user.patient
    health_id_obj, _ = PatientHealthID.objects.get_or_create(patient=patient)
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(health_id_obj.health_id_str)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    
    return HttpResponse(buffer.getvalue(), content_type="image/png")
