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
    primary_condition = serializers.SerializerMethodField()
    disease_category = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = '__all__'
        
    def get_primary_condition(self, obj):
        cond = obj.conditions.order_by('-onset_date').first()
        return cond.description if cond else 'General Health Evaluation'

    def get_disease_category(self, obj):
        conds = list(obj.conditions.values_list('description', flat=True))
        all_text = " ".join(conds).lower()
        
        # Check specific disease categories in priority order
        if any(w in all_text for w in ['kidney', 'renal', 'nephro', 'glomerular', 'ckd', 'dialysis', 'polycystic']):
            return 'Kidney Diseases'
        elif any(w in all_text for w in ['cancer', 'carcinoma', 'melanoma', 'lymphoma', 'leukemia', 'neoplasm', 'tumor', 'adenocarcinoma']):
            return 'Cancers (Oncology)'
        elif any(w in all_text for w in ['asthma', 'copd', 'bronchitis', 'pulmonary fibrosis', 'fibrosis', 'apnea', 'interstitial lung', 'emphysema']):
            return 'Respiratory Diseases'
        elif any(w in all_text for w in ['heart', 'cardio', 'coronary', 'stemi', 'infarction', 'artery', 'arrhythmia', 'angina', 'cardiac', 'atrial fibrillation', 'hypertension']):
            return 'Cardiovascular & Heart Diseases'
        elif any(w in all_text for w in ['covid', 'tuberculosis', 'pneumonia', 'hepatitis', 'infect', 'influenza', 'strep', 'viral', 'hiv', 'dengue']):
            return 'Infectious & Communicable Diseases'
            
        return 'Cardiovascular & Heart Diseases'
        
    def get_access_state(self, obj):
        request = self.context.get('request')
        if not request or not request.user or request.user.role != 'doctor':
            return 'NO_ACCESS'
            
        doctor_id = request.query_params.get('doctor_id') or request.headers.get('X-Doctor-ID')
        if not doctor_id and hasattr(request.user, 'doctor'):
            doctor_id = request.user.doctor.source_id
            
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
