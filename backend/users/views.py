from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user
    
    if request.method in ['PUT', 'PATCH']:
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        phone = request.data.get('phone', '')
        
        if email is not None:
            user.email = email
            user.save(update_fields=['email'])
            
        if user.role == 'doctor' and hasattr(user, 'doctor'):
            doctor = user.doctor
            if first_name is not None or last_name is not None:
                f_name = first_name if first_name is not None else user.first_name
                l_name = last_name if last_name is not None else user.last_name
                full = f"{f_name} {l_name}".strip()
                if full and not full.lower().startswith('dr.'):
                    full = f"Dr. {full}"
                doctor.name = full or doctor.name
            if 'specialty' in request.data:
                doctor.specialty = request.data.get('specialty')
            doctor.save()
            
        elif user.role == 'patient' and hasattr(user, 'patient'):
            patient = user.patient
            if first_name is not None: patient.first_name = first_name
            if last_name is not None: patient.last_name = last_name
            if 'gender' in request.data: patient.gender = request.data.get('gender')
            if 'dob' in request.data: patient.dob = request.data.get('dob')
            if 'blood_group' in request.data: patient.blood_group = request.data.get('blood_group')
            if 'address' in request.data: patient.address = request.data.get('address')
            patient.save()

    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'date_joined': user.date_joined.isoformat() if hasattr(user, 'date_joined') and user.date_joined else None,
    }
    if user.role == 'doctor' and hasattr(user, 'doctor'):
        doc = user.doctor
        data['doctor_id'] = doc.source_id
        data['name'] = doc.name
        data['specialty'] = doc.specialty or 'General Medicine'
        data['hospital'] = doc.hospital.name if doc.hospital else 'General Hospital'
        data['hospital_id'] = str(doc.hospital.id) if doc.hospital else None
    elif user.role == 'patient' and hasattr(user, 'patient'):
        p = user.patient
        data['patient_id'] = str(p.id)
        data['first_name'] = p.first_name
        data['last_name'] = p.last_name
        data['name'] = f"{p.first_name} {p.last_name}".strip()
        data['gender'] = p.gender or 'Not Specified'
        data['dob'] = str(p.dob) if p.dob else None
        data['blood_group'] = p.blood_group or 'Unknown'
        data['address'] = p.address or ''
        data['hospital'] = p.primary_hospital.name if p.primary_hospital else 'Central Health System'
        if hasattr(p, 'health_id'):
            data['health_id'] = p.health_id.health_id_str
    return Response(data)

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        # Blacklist the access token too using cache
        from django.core.cache import cache
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            access_token = auth_header.split(' ')[1]
            cache.set(f"blacklisted_{access_token}", True, timeout=3600)
            
        return Response(status=status.HTTP_205_RESET_CONTENT)
    except Exception as e:
        return Response(status=status.HTTP_400_BAD_REQUEST)

from users.permissions import IsDoctor

@api_view(['POST'])
@permission_classes([IsDoctor])
def demo_login_as_patient(request, patient_id):
    from patients.models import Patient
    from django.shortcuts import get_object_or_404
    patient = get_object_or_404(Patient, id=patient_id)
    user = patient.user
    if not user:
        from users.models import User
        import uuid
        username = f"demo_pt_{str(uuid.uuid4())[:8]}"
        user = User.objects.create_user(username=username, password='password123', role='patient')
        patient.user = user
        patient.save()
        
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'patient_id': str(patient.id),
            'name': f"{patient.first_name} {patient.last_name}"
        }
    })

@api_view(['POST'])
@permission_classes([])
def register_view(request):
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        if not username or not password or not role:
            return Response({'error': 'Username, password, and role are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if role not in ['patient', 'doctor']:
            return Response({'error': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from users.models import User, Doctor
        from patients.models import Patient
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.create_user(username=username, password=password, role=role)
        
        if role == 'patient':
            Patient.objects.create(user=user, first_name=first_name, last_name=last_name)
            user.save()
        elif role == 'doctor':
            import uuid
            from users.models import Hospital
            from consent.models import AccessGrant
            from django.utils import timezone
            from datetime import timedelta
            
            source_id = str(uuid.uuid4())
            raw_doc_name = f"{first_name} {last_name}".strip() or username
            doc_name = raw_doc_name if raw_doc_name.lower().startswith('dr.') else f"Dr. {raw_doc_name}"
            
            default_hospital = Hospital.objects.first()
            doctor = Doctor.objects.create(
                name=doc_name,
                source_id=source_id,
                user=user,
                hospital=default_hospital,
                specialty="General Medicine"
            )
            
            # Automatically provision access grants for existing patients for smooth demo/clinical testing
            for patient in Patient.objects.all():
                AccessGrant.objects.get_or_create(
                    patient=patient,
                    doctor=doctor,
                    defaults={
                        'hospital': default_hospital,
                        'scope': ['medical_history', 'lab_reports', 'prescriptions'],
                        'purpose': 'Direct Care & Clinical Review',
                        'status': 'approved',
                        'approval_date': timezone.now(),
                        'expiry_date': timezone.now() + timedelta(days=365)
                    }
                )
            
        return Response({'status': 'Registration successful'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
from users.models import Notification
from rest_framework import viewsets, mixins
from rest_framework.decorators import action

class NotificationViewSet(viewsets.GenericViewSet, mixins.ListModelMixin):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
        
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = [{
            'id': n.id,
            'type': n.type,
            'message': n.message,
            'is_read': n.is_read,
            'created_at': n.created_at
        } for n in qs]
        return Response(data)
        
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        try:
            n = self.get_queryset().get(id=pk)
            n.is_read = True
            n.save()
            return Response({'status': 'ok'})
        except:
            return Response({'error': 'not found'}, status=status.HTTP_404_NOT_FOUND)
            
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'ok'})

from rest_framework.views import APIView

class SpecialistSearchView(APIView):
    permission_classes = [IsDoctor]
    
    def get(self, request):
        specialty = request.query_params.get('specialty', '').lower()
        name = request.query_params.get('name', '').lower()
        
        qs = Doctor.objects.all()
        if specialty:
            qs = qs.filter(specialty__icontains=specialty)
        if name:
            qs = qs.filter(name__icontains=name)
            
        data = [{
            'id': str(d.source_id),
            'name': d.name,
            'specialty': getattr(d, 'specialty', 'General'),
            'hospital': d.hospital.name if d.hospital else None
        } for d in qs]
        
        return Response(data)
