"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from patients.views import PatientViewSet, get_health_id_qr, resolve_health_id
from records.views import EncounterViewSet, ConditionViewSet, AllergyViewSet, PrescriptionViewSet, ObservationViewSet, ProcedureViewSet, PatientInsightsView, PatientTimelineView, PatientChatView, DoctorDiagnosisView, OcrExtractionView, ReferralViewSet, FhirPatientView, PatientReportUploadAnalysisView, PatientDietPlanView
from consent.views import ConsentViewSet
from audit.views import AuditViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from users.views import current_user, logout_view, register_view, NotificationViewSet, demo_login_as_patient, SpecialistSearchView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/logout/', logout_view, name='logout'),
    path('api/register/', register_view, name='register'),
    path('api/demo-login-patient/<uuid:patient_id>/', demo_login_as_patient, name='demo_login_patient'),
    path('api/me/', current_user, name='current_user'),
    
    path('api/patients/', PatientViewSet.as_view({'get': 'list'})),
    path('api/patients/<uuid:pk>/', PatientViewSet.as_view({'get': 'retrieve'})),
    path('api/patients/health-id/qr/', get_health_id_qr),
    path('api/patients/health-id/resolve/', resolve_health_id),
    
    path('api/patients/<uuid:patient_pk>/encounters/', EncounterViewSet.as_view({'get': 'list'})),
    path('api/patients/<uuid:patient_pk>/conditions/', ConditionViewSet.as_view({'get': 'list'})),
    path('api/patients/<uuid:patient_pk>/allergies/', AllergyViewSet.as_view({'get': 'list'})),
    path('api/patients/<uuid:patient_pk>/prescriptions/', PrescriptionViewSet.as_view({'get': 'list'})),
    path('api/patients/<uuid:patient_pk>/observations/', ObservationViewSet.as_view({'get': 'list'})),
    path('api/patients/<uuid:patient_pk>/procedures/', ProcedureViewSet.as_view({'get': 'list'})),
    path('api/patients/<uuid:patient_pk>/insights/', PatientInsightsView.as_view()),
    path('api/patients/<uuid:patient_pk>/timeline/', PatientTimelineView.as_view()),
    path('api/patients/<uuid:patient_pk>/chat/', PatientChatView.as_view()),
    path('api/patients/<uuid:patient_pk>/doctor-diagnosis/', DoctorDiagnosisView.as_view()),
    path('api/ocr/', OcrExtractionView.as_view()),
    path('api/analyze-report/', PatientReportUploadAnalysisView.as_view()),
    path('api/diet-plan/', PatientDietPlanView.as_view()),

    path('api/consents/', ConsentViewSet.as_view({'get': 'list'})),
    path('api/consents/request/', ConsentViewSet.as_view({'post': 'request_access'})),
    path('api/consents/<uuid:pk>/approve/', ConsentViewSet.as_view({'post': 'approve'})),
    path('api/consents/<uuid:pk>/reject/', ConsentViewSet.as_view({'post': 'reject'})),
    path('api/consents/<uuid:pk>/revoke/', ConsentViewSet.as_view({'post': 'revoke'})),
    
    path('api/audit/', AuditViewSet.as_view({'get': 'list'})),
    path('api/specialists/', SpecialistSearchView.as_view()),
    path('api/referrals/', ReferralViewSet.as_view({'post': 'create'})),
    path('fhir/Patient/<uuid:pk>/', FhirPatientView.as_view()),
]
