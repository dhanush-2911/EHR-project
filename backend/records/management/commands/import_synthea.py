import os
import csv
import json
import time
from datetime import datetime
from dateutil.parser import parse as parse_date
from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import Hospital, Doctor, User
from patients.models import Patient
from records.models import Encounter, Condition, AllergyRecord, Prescription, Observation, Procedure
from django.conf import settings

class Command(BaseCommand):
    help = 'Import Synthea synthetic patient data'

    def add_arguments(self, parser):
        parser.add_argument('--format', type=str, default='csv', choices=['csv', 'fhir'], help='Format of the dataset')
        parser.add_argument('--limit', type=int, default=0, help='Limit number of patients to import')
        parser.add_argument('--reset', action='store_true', help='Destructive! Delete all existing records before import')
        parser.add_argument('--yes', action='store_true', help='Bypass confirmation for reset')

    def handle(self, *args, **options):
        format_type = options['format']
        limit = options['limit']
        reset = options['reset']
        
        if reset:
            if not options['yes']:
                confirm = input("This will DESTROY ALL existing clinical data. Type 'yes' to continue: ")
                if confirm.lower() != 'yes':
                    self.stdout.write(self.style.WARNING("Reset aborted."))
                    return
            self.stdout.write(self.style.WARNING("Deleting existing data..."))
            Procedure.objects.all().delete()
            Observation.objects.all().delete()
            Prescription.objects.all().delete()
            AllergyRecord.objects.all().delete()
            Condition.objects.all().delete()
            Encounter.objects.all().delete()
            Patient.objects.all().delete()
            Doctor.objects.all().delete()
            Hospital.objects.all().delete()

        data_dir = os.path.join(settings.BASE_DIR, 'data', 'synthea', format_type)
        if not os.path.exists(data_dir):
            self.stdout.write(self.style.ERROR(f"Dataset directory not found: {data_dir}"))
            self.stdout.write("Please download the Synthea dataset and place it in the directory.")
            return
            
        start_time = time.time()
        report = {
            "total_patients": 0, "total_hospitals": 0, "total_doctors": 0,
            "total_encounters": 0, "total_conditions": 0, "total_allergies": 0,
            "total_prescriptions": 0, "total_observations": 0, "total_procedures": 0,
            "records_inserted": 0, "records_updated": 0, "records_skipped": 0,
            "records_failed": 0, "duplicate_records_prevented": 0,
            "import_duration_seconds": 0
        }

        if format_type == 'csv':
            self.import_csv(data_dir, limit, report)
        else:
            self.import_fhir(data_dir, limit, report)

        report["import_duration_seconds"] = round(time.time() - start_time, 2)
        
        # Write report
        report_dir = os.path.join(settings.BASE_DIR, 'data', 'reports')
        os.makedirs(report_dir, exist_ok=True)
        
        with open(os.path.join(report_dir, 'synthea_import_report.json'), 'w') as f:
            json.dump(report, f, indent=4)
            
        with open(os.path.join(report_dir, 'synthea_import_report.md'), 'w') as f:
            f.write("# Synthea Import Report\n\n")
            for k, v in report.items():
                f.write(f"- **{k.replace('_', ' ').title()}**: {v}\n")

        self.stdout.write(self.style.SUCCESS(f"Import completed in {report['import_duration_seconds']}s. Report saved to {report_dir}."))

    def safe_date(self, date_str):
        if not date_str: return None
        try:
            # handle dates like 2018-05-13 or 2018-05-13T10:20:00Z
            return parse_date(date_str).strftime('%Y-%m-%d %H:%M:%S')
        except:
            return None

    def safe_date_only(self, date_str):
        if not date_str: return None
        try:
            return parse_date(date_str).strftime('%Y-%m-%d')
        except:
            return None

    def import_csv(self, data_dir, limit, report):
        # 1. Hospitals (organizations.csv)
        org_file = os.path.join(data_dir, 'organizations.csv')
        if os.path.exists(org_file):
            with open(org_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    Hospital.objects.update_or_create(
                        source_id=row.get('Id'),
                        defaults={'name': row.get('NAME', 'Unknown Hospital'), 'address': row.get('ADDRESS', '')}
                    )
                    report['total_hospitals'] += 1
                    report['records_inserted'] += 1

        # 2. Doctors (providers.csv)
        prov_file = os.path.join(data_dir, 'providers.csv')
        if os.path.exists(prov_file):
            with open(prov_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    org = Hospital.objects.filter(source_id=row.get('ORGANIZATION')).first()
                    Doctor.objects.update_or_create(
                        source_id=row.get('Id'),
                        defaults={
                            'name': row.get('NAME', 'Unknown Doctor'),
                            'specialty': row.get('SPECIALTY', ''),
                            'hospital': org
                        }
                    )
                    report['total_doctors'] += 1
                    report['records_inserted'] += 1

        # 3. Patients (patients.csv)
        pat_file = os.path.join(data_dir, 'patients.csv')
        valid_patient_ids = set()
        if os.path.exists(pat_file):
            with open(pat_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    if limit > 0 and i >= limit: break
                    pid = row.get('Id')
                    valid_patient_ids.add(pid)
                    Patient.objects.update_or_create(
                        source_id=pid,
                        defaults={
                            'first_name': row.get('FIRST', ''),
                            'last_name': row.get('LAST', ''),
                            'gender': row.get('GENDER', ''),
                            'dob': self.safe_date_only(row.get('BIRTHDATE')),
                            'address': row.get('ADDRESS', '')
                        }
                    )
                    report['total_patients'] += 1
                    report['records_inserted'] += 1
        
        # Helpers for checking if patient is in valid_patient_ids
        def check_patient(pid):
            if pid not in valid_patient_ids:
                report['records_skipped'] += 1
                return False
            return True

        # 4. Encounters (encounters.csv)
        enc_file = os.path.join(data_dir, 'encounters.csv')
        if os.path.exists(enc_file):
            with open(enc_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    pid = row.get('PATIENT')
                    if not check_patient(pid): continue
                    
                    patient = Patient.objects.get(source_id=pid)
                    provider = Doctor.objects.filter(source_id=row.get('PROVIDER')).first()
                    hospital = Hospital.objects.filter(source_id=row.get('ORGANIZATION')).first()
                    
                    Encounter.objects.update_or_create(
                        source_id=row.get('Id'),
                        defaults={
                            'patient': patient,
                            'provider': provider,
                            'hospital': hospital,
                            'encounter_type': row.get('ENCOUNTERCLASS', ''),
                            'start_date': self.safe_date(row.get('START')),
                            'end_date': self.safe_date(row.get('STOP')),
                            'reason': row.get('REASONDESCRIPTION', '')
                        }
                    )
                    report['total_encounters'] += 1
                    report['records_inserted'] += 1

        # 5. Conditions (conditions.csv)
        cond_file = os.path.join(data_dir, 'conditions.csv')
        if os.path.exists(cond_file):
            with open(cond_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    pid = row.get('PATIENT')
                    if not check_patient(pid): continue
                    
                    patient = Patient.objects.get(source_id=pid)
                    encounter = Encounter.objects.filter(source_id=row.get('ENCOUNTER')).first()
                    
                    # Create a deterministic surrogate key for conditions since Synthea doesn't have Condition UUIDs in CSV usually
                    cond_src_id = f"{pid}_{row.get('CODE')}_{i}"
                    
                    Condition.objects.update_or_create(
                        source_id=cond_src_id,
                        defaults={
                            'patient': patient,
                            'encounter': encounter,
                            'code': row.get('CODE', ''),
                            'description': row.get('DESCRIPTION', ''),
                            'onset_date': self.safe_date_only(row.get('START')),
                            'resolved_date': self.safe_date_only(row.get('STOP'))
                        }
                    )
                    report['total_conditions'] += 1
                    report['records_inserted'] += 1

        # 6. Allergies (allergies.csv)
        all_file = os.path.join(data_dir, 'allergies.csv')
        if os.path.exists(all_file):
            with open(all_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    pid = row.get('PATIENT')
                    if not check_patient(pid): continue
                    
                    patient = Patient.objects.get(source_id=pid)
                    all_src_id = f"ALLERGY_{pid}_{row.get('CODE')}_{i}"
                    
                    AllergyRecord.objects.update_or_create(
                        source_id=all_src_id,
                        defaults={
                            'patient': patient,
                            'allergen': row.get('DESCRIPTION', ''),
                            'reaction': row.get('REACTION1', ''),
                            'severity': row.get('SEVERITY1', ''),
                        }
                    )
                    report['total_allergies'] += 1
                    report['records_inserted'] += 1

        # 7. Medications/Prescriptions (medications.csv)
        med_file = os.path.join(data_dir, 'medications.csv')
        if os.path.exists(med_file):
            with open(med_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    pid = row.get('PATIENT')
                    if not check_patient(pid): continue
                    
                    patient = Patient.objects.get(source_id=pid)
                    encounter = Encounter.objects.filter(source_id=row.get('ENCOUNTER')).first()
                    med_src_id = f"MED_{pid}_{row.get('CODE')}_{i}"
                    
                    Prescription.objects.update_or_create(
                        source_id=med_src_id,
                        defaults={
                            'patient': patient,
                            'encounter': encounter,
                            'medication_name': row.get('DESCRIPTION', ''),
                            'medication_code': row.get('CODE', ''),
                            'start_date': self.safe_date(row.get('START')),
                            'end_date': self.safe_date(row.get('STOP')),
                            'dosage': row.get('DISPENSES', '')
                        }
                    )
                    report['total_prescriptions'] += 1
                    report['records_inserted'] += 1

        # 8. Observations (observations.csv)
        obs_file = os.path.join(data_dir, 'observations.csv')
        if os.path.exists(obs_file):
            with open(obs_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader):
                    pid = row.get('PATIENT')
                    if not check_patient(pid): continue
                    
                    patient = Patient.objects.get(source_id=pid)
                    encounter = Encounter.objects.filter(source_id=row.get('ENCOUNTER')).first()
                    obs_src_id = f"OBS_{pid}_{row.get('CODE')}_{i}"
                    
                    Observation.objects.update_or_create(
                        source_id=obs_src_id,
                        defaults={
                            'patient': patient,
                            'encounter': encounter,
                            'date': self.safe_date(row.get('DATE')),
                            'test_name': row.get('DESCRIPTION', ''),
                            'value': row.get('VALUE', ''),
                            'units': row.get('UNITS', ''),
                        }
                    )
                    report['total_observations'] += 1
                    report['records_inserted'] += 1

    def import_fhir(self, data_dir, limit, report):
        self.stdout.write(self.style.WARNING("FHIR import is stubbed out for the prototype."))
        # Implement FHIR logic matching the CSV logic by iterating JSON files in data_dir
        pass
