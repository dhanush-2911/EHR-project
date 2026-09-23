from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'action', 'patient', 'doctor', 'resource')
    list_filter = ('action', 'resource')
    search_fields = ('patient__first_name', 'patient__last_name', 'doctor__name')
    readonly_fields = [f.name for f in AuditLog._meta.fields]
    
    def has_add_permission(self, request):
        return False
        
    def has_change_permission(self, request, obj=None):
        return False
        
    def has_delete_permission(self, request, obj=None):
        return False
