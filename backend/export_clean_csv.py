import os
import django
import csv

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from patients.models import Patient
from records.models import Condition, Prescription, Observation, Encounter, AllergyRecord

csv_dir = os.path.join("data", "synthea", "csv")
os.makedirs(csv_dir, exist_ok=True)

# 1. Export patients.csv
with open(os.path.join(csv_dir, "patients.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["Id", "BIRTHDATE", "DEATHDATE", "FIRST", "LAST", "GENDER", "BLOOD_GROUP", "ADDRESS"])
    for p in Patient.objects.all():
        writer.writerow([str(p.id), str(p.dob), "", p.first_name, p.last_name, p.gender, p.blood_group, p.address])

# 2. Export conditions.csv
with open(os.path.join(csv_dir, "conditions.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["START", "STOP", "PATIENT", "ENCOUNTER", "CODE", "DESCRIPTION"])
    for c in Condition.objects.all():
        writer.writerow([str(c.onset_date), str(c.resolved_date or ""), str(c.patient.id), str(c.encounter.id if c.encounter else ""), c.code, c.description])

# 3. Export medications.csv
with open(os.path.join(csv_dir, "medications.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["START", "STOP", "PATIENT", "PAYER", "ENCOUNTER", "CODE", "DESCRIPTION", "DOSAGE"])
    for rx in Prescription.objects.all():
        writer.writerow([str(rx.start_date), str(rx.end_date or ""), str(rx.patient.id), "", str(rx.encounter.id if rx.encounter else ""), rx.medication_code, rx.medication_name, rx.dosage])

# 4. Export observations.csv
with open(os.path.join(csv_dir, "observations.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["DATE", "PATIENT", "ENCOUNTER", "CODE", "DESCRIPTION", "VALUE", "UNITS", "REFERENCE_RANGE"])
    for o in Observation.objects.all():
        writer.writerow([str(o.date), str(o.patient.id), str(o.encounter.id if o.encounter else ""), "", o.test_name, o.value, o.units, o.reference_range])

# 5. Export encounters.csv
with open(os.path.join(csv_dir, "encounters.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["Id", "START", "STOP", "PATIENT", "ORGANIZATION", "PROVIDER", "PAYER", "ENCOUNTERCLASS", "REASONDESCRIPTION"])
    for e in Encounter.objects.all():
        writer.writerow([str(e.id), str(e.start_date), str(e.end_date or ""), str(e.patient.id), str(e.hospital.name if e.hospital else ""), str(e.provider.name if e.provider else ""), "", e.encounter_type, e.reason])

# 6. Export allergies.csv
with open(os.path.join(csv_dir, "allergies.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["START", "STOP", "PATIENT", "ENCOUNTER", "CODE", "DESCRIPTION", "SEVERITY", "REACTION"])
    for a in AllergyRecord.objects.all():
        writer.writerow(["2025-01-01", "", str(a.patient.id), "", "", a.allergen, a.severity, a.reaction])

print("CSV export completed successfully in data/synthea/csv!")
