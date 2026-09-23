from rest_framework import serializers
from .models import Patient
from users.models import Hospital

class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = '__all__'

class PatientSerializer(serializers.ModelSerializer):
    primary_hospital = HospitalSerializer(read_only=True)
    access_state = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = '__all__'
        
    def get_access_state(self, obj):
        request = self.context.get('request')
        if not request or not request.user or request.user.role != 'doctor':
            return 'NO_ACCESS'
            
        doctor_id = request.query_params.get('doctor_id') or request.headers.get('X-Doctor-ID')
        if not doctor_id:
            return 'NO_ACCESS'
            
        from consent.models import AccessGrant
        
        # Check active grants first
        grants = AccessGrant.objects.filter(doctor__source_id=doctor_id, patient=obj).order_by('-request_date')
        if not grants.exists():
            return 'NO_ACCESS'
            
        latest = grants.first()
        if latest.status == 'approved' and not latest.is_active:
            return 'EXPIRED'
        
        return latest.status.upper()
