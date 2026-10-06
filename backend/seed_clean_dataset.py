import os
import django
import uuid
import datetime
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from users.models import User, Doctor, Hospital
from patients.models import Patient, PatientHealthID
from records.models import Encounter, Condition, Prescription, Observation, AllergyRecord, Procedure
from consent.models import AccessGrant

print("Step 1: Clearing old synthetic records via direct SQL...")
with connection.cursor() as cursor:
    cursor.execute("DELETE FROM records_observation;")
    cursor.execute("DELETE FROM records_prescription;")
    cursor.execute("DELETE FROM records_condition;")
    cursor.execute("DELETE FROM records_encounter;")
    cursor.execute("DELETE FROM records_allergyrecord;")
    cursor.execute("DELETE FROM records_procedure;")
    cursor.execute("DELETE FROM records_referral;")
    cursor.execute("DELETE FROM consent_accessgrant;")
    cursor.execute("DELETE FROM audit_auditlog;")
    cursor.execute("DELETE FROM patients_patienthealthid;")
    cursor.execute("DELETE FROM patients_patient;")

print("Old clinical records deleted successfully.")

# Step 2: Ensure primary hospital and doctor exist
hospital, _ = Hospital.objects.get_or_create(
    name="Metro General Hospital",
    defaults={"address": "100 Healthcare Blvd, Suite 400", "source_id": "HOSP-METRO-001"}
)

doc_user, _ = User.objects.get_or_create(
    username="drsmith",
    defaults={"role": "doctor"}
)
doc_user.set_password("password123")
doc_user.role = "doctor"
doc_user.save()

doctor, _ = Doctor.objects.get_or_create(
    user=doc_user,
    defaults={
        "name": "Dr. Sarah Smith, MD",
        "specialty": "Internal Medicine & Cardiology",
        "hospital": hospital,
        "source_id": "DOC-SMITH-001"
    }
)
doctor.name = "Dr. Sarah Smith, MD"
doctor.specialty = "Internal Medicine & Cardiology"
doctor.hospital = hospital
doctor.source_id = "DOC-SMITH-001"
doctor.save()

# Ensure Jane Smith patient user exists
jane_user, _ = User.objects.get_or_create(
    username="janesmith",
    defaults={"role": "patient"}
)
jane_user.set_password("password123")
jane_user.role = "patient"
jane_user.save()

print(f"Doctor configured: {doctor.name} (User: {doc_user.username})")

# Step 3: Define Clean, Understandable Clinical Dataset across the 5 categories
PATIENTS_DATA = [
    # --- Category 1: Infectious & Communicable Diseases ---
    {
        "first_name": "Michael",
        "last_name": "Chang",
        "gender": "M",
        "dob": datetime.date(1984, 5, 12),
        "blood_group": "O+",
        "address": "452 Pine Valley Rd, Springfield",
        "category": "Infectious & Communicable Diseases",
        "encounters": [
            {
                "type": "Emergency / Inpatient Admission",
                "start": datetime.datetime(2026, 2, 14, 10, 30, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 20, 16, 0, tzinfo=datetime.timezone.utc),
                "reason": "Acute respiratory distress and persistent high fever due to viral pneumonia."
            }
        ],
        "conditions": [
            {"code": "U07.1", "description": "COVID-19 with Acute Hypoxemic Respiratory Failure", "onset": datetime.date(2026, 2, 14)},
            {"code": "J12.82", "description": "Viral Pneumonia complicated by secondary bacterial infection", "onset": datetime.date(2026, 2, 15)}
        ],
        "prescriptions": [
            {"name": "Nirmatrelvir 300mg / Ritonavir 100mg Oral (Paxlovid)", "dosage": "Twice daily for 5 days", "status": "active"},
            {"name": "Dexamethasone 6 MG Oral Tablet", "dosage": "Once daily in morning", "status": "active"},
            {"name": "Ceftriaxone 1000 MG Injection", "dosage": "IV daily", "status": "active"}
        ],
        "observations": [
            {"name": "Pulse Oximetry (SpO2)", "value": "91.0", "units": "%", "range": "95-100"},
            {"name": "Body Temperature", "value": "102.4", "units": "deg F", "range": "97.0-99.0"},
            {"name": "C-Reactive Protein (CRP)", "value": "48.5", "units": "mg/L", "range": "0.0-5.0"},
            {"name": "White Blood Cell Count (WBC)", "value": "13.8", "units": "10*3/uL", "range": "4.5-11.0"},
            {"name": "Serum Ferritin", "value": "620.0", "units": "ng/mL", "range": "30-400"}
        ],
        "allergies": [
            {"allergen": "Penicillin", "reaction": "Cutaneous maculopapular rash", "severity": "Moderate"}
        ]
    },
    {
        "first_name": "Amina",
        "last_name": "Patel",
        "gender": "F",
        "dob": datetime.date(1992, 9, 18),
        "blood_group": "A+",
        "address": "78 Heritage Way, Springfield",
        "category": "Infectious & Communicable Diseases",
        "encounters": [
            {
                "type": "Infectious Disease Specialist Consultation",
                "start": datetime.datetime(2026, 1, 10, 11, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 1, 10, 12, 15, tzinfo=datetime.timezone.utc),
                "reason": "Evaluation of persistent cough for 4 weeks with night sweats and hemoptysis."
            }
        ],
        "conditions": [
            {"code": "A15.0", "description": "Active Pulmonary Tuberculosis (Mycobacterium tuberculosis)", "onset": datetime.date(2026, 1, 10)},
            {"code": "R04.2", "description": "Hemoptysis (Blood-tinged sputum)", "onset": datetime.date(2026, 1, 8)}
        ],
        "prescriptions": [
            {"name": "Rifampin 300 MG Oral Capsule", "dosage": "600mg daily on empty stomach", "status": "active"},
            {"name": "Isoniazid 300 MG Oral Tablet", "dosage": "300mg once daily", "status": "active"},
            {"name": "Pyrazinamide 500 MG Oral Tablet", "dosage": "1500mg daily", "status": "active"},
            {"name": "Ethambutol Hydrochloride 400 MG Oral Tablet", "dosage": "1200mg daily", "status": "active"},
            {"name": "Pyridoxine (Vitamin B6) 50 MG Tablet", "dosage": "Once daily with Isoniazid", "status": "active"}
        ],
        "observations": [
            {"name": "Acid-Fast Bacilli Sputum Smear (AFB)", "value": "Positive (3+)", "units": "{qualitative}", "range": "Negative"},
            {"name": "Erythrocyte Sedimentation Rate (ESR)", "value": "65.0", "units": "mm/hr", "range": "0-20"},
            {"name": "Chest X-Ray Findings", "value": "Right upper lobe cavitary consolidation", "units": "{text}", "range": "Clear"}
        ],
        "allergies": []
    },

    # --- Category 2: Cancers (Oncology) ---
    {
        "first_name": "Eleanor",
        "last_name": "Vance",
        "gender": "F",
        "dob": datetime.date(1970, 3, 24),
        "blood_group": "B+",
        "address": "129 Oakwood Crest, Springfield",
        "category": "Cancers (Oncology)",
        "encounters": [
            {
                "type": "Oncology Outpatient Clinic",
                "start": datetime.datetime(2026, 2, 20, 14, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 20, 15, 30, tzinfo=datetime.timezone.utc),
                "reason": "Adjuvant endocrine therapy monitoring for breast carcinoma."
            }
        ],
        "conditions": [
            {"code": "C50.912", "description": "Invasive Ductal Carcinoma of Left Breast (Stage IIB, ER+/PR+/HER2-)", "onset": datetime.date(2025, 8, 15)},
            {"code": "Z85.3", "description": "Personal history of malignant neoplasm of breast", "onset": datetime.date(2025, 8, 15)}
        ],
        "prescriptions": [
            {"name": "Anastrozole 1 MG Oral Tablet", "dosage": "1mg daily oral", "status": "active"},
            {"name": "Calcium Carbonate 500 MG / Vitamin D3 400 UNIT", "dosage": "Twice daily with meals", "status": "active"},
            {"name": "Ondansetron 8 MG Oral Tablet", "dosage": "Every 8 hours as needed for nausea", "status": "active"}
        ],
        "observations": [
            {"name": "Cancer Antigen 15-3 (CA 15-3)", "value": "18.2", "units": "U/mL", "range": "0-30"},
            {"name": "Hemoglobin", "value": "11.6", "units": "g/dL", "range": "12.0-16.0"},
            {"name": "Platelet Count", "value": "195.0", "units": "10*3/uL", "range": "150-450"},
            {"name": "Bone Mineral Density (T-Score)", "value": "-1.4", "units": "{score}", "range": "> -1.0"}
        ],
        "allergies": [
            {"allergen": "Sulfamethoxazole / Trimethoprim (Bactrim)", "reaction": "Urticaria and facial swelling", "severity": "High"}
        ]
    },
    {
        "first_name": "Robert",
        "last_name": "Chen",
        "gender": "M",
        "dob": datetime.date(1962, 11, 4),
        "blood_group": "AB+",
        "address": "610 Cedar Ridge Ave, Springfield",
        "category": "Cancers (Oncology)",
        "encounters": [
            {
                "type": "Thoracic Oncology Consultation",
                "start": datetime.datetime(2026, 1, 18, 9, 30, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 1, 18, 11, 0, tzinfo=datetime.timezone.utc),
                "reason": "Multidisciplinary review of primary lung adenocarcinoma."
            }
        ],
        "conditions": [
            {"code": "C34.12", "description": "Malignant Neoplasm of Left Upper Lobe (Adenocarcinoma Stage IIIA)", "onset": datetime.date(2025, 10, 2)},
            {"code": "R05", "description": "Chronic Cough with persistent hoarseness", "onset": datetime.date(2025, 9, 15)}
        ],
        "prescriptions": [
            {"name": "Pemetrexed 500 MG/M2 Injection", "dosage": "IV every 21 days", "status": "active"},
            {"name": "Dexamethasone 4 MG Oral Tablet", "dosage": "Twice daily for 3 days starting pre-chemo", "status": "active"},
            {"name": "Folic Acid 1 MG Oral Tablet", "dosage": "Daily oral supplementation", "status": "active"}
        ],
        "observations": [
            {"name": "Carcinoembryonic Antigen (CEA)", "value": "14.2", "units": "ng/mL", "range": "0.0-3.0"},
            {"name": "Chest CT Tumor Size", "value": "3.4", "units": "cm", "range": "None"},
            {"name": "Pulse Oximetry (SpO2)", "value": "93.0", "units": "%", "range": "95-100"},
            {"name": "Alanine Aminotransferase (ALT)", "value": "28.0", "units": "U/L", "range": "7-56"}
        ],
        "allergies": [
            {"allergen": "Iodinated Radiocontrast Media", "reaction": "Bronchospasm and pruritus", "severity": "High"}
        ]
    },

    # --- Category 3: Respiratory Diseases ---
    {
        "first_name": "Arthur",
        "last_name": "Pendleton",
        "gender": "M",
        "dob": datetime.date(1958, 7, 19),
        "blood_group": "A-",
        "address": "334 Elmhurst St, Springfield",
        "category": "Respiratory Diseases",
        "encounters": [
            {
                "type": "Pulmonology Outpatient Visit",
                "start": datetime.datetime(2026, 2, 28, 13, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 28, 14, 0, tzinfo=datetime.timezone.utc),
                "reason": "Exacerbation of chronic dyspnea and wheezing."
            }
        ],
        "conditions": [
            {"code": "J44.1", "description": "Chronic Obstructive Pulmonary Disease (COPD) with Acute Exacerbation", "onset": datetime.date(2025, 4, 10)},
            {"code": "J44.9", "description": "Chronic Emphysema with persistent air trapping", "onset": datetime.date(2024, 1, 15)}
        ],
        "prescriptions": [
            {"name": "Tiotropium Bromide 18 MCG Inhalation Powder (Spiriva)", "dosage": "1 capsule inhaled once daily", "status": "active"},
            {"name": "Fluticasone Propionate / Salmeterol 250/50 Inhalation (Advair)", "dosage": "1 puff twice daily", "status": "active"},
            {"name": "Albuterol Sulfate 0.09 MG/ACT Inhaler (Ventolin)", "dosage": "1-2 puffs every 4 hours PRN dyspnea", "status": "active"},
            {"name": "Prednisone 20 MG Oral Tablet", "dosage": "1 tablet daily for 5-day taper", "status": "active"}
        ],
        "observations": [
            {"name": "FEV1 / FVC Ratio", "value": "0.52", "units": "{ratio}", "range": "> 0.70"},
            {"name": "FEV1 % Predicted", "value": "46.0", "units": "%", "range": "> 80.0"},
            {"name": "Arterial Oxygen Partial Pressure (PaO2)", "value": "59.0", "units": "mmHg", "range": "75-100"},
            {"name": "Pulse Oximetry (SpO2)", "value": "89.0", "units": "%", "range": "95-100"},
            {"name": "Respiration Rate", "value": "24.0", "units": "/min", "range": "12-20"}
        ],
        "allergies": [
            {"allergen": "Aspirin", "reaction": "Induced bronchospasm", "severity": "High"}
        ]
    },
    {
        "first_name": "Sophia",
        "last_name": "Martinez",
        "gender": "F",
        "dob": datetime.date(1998, 2, 11),
        "blood_group": "O+",
        "address": "89 Brookside Ct, Springfield",
        "category": "Respiratory Diseases",
        "encounters": [
            {
                "type": "Allergy & Asthma Clinic Evaluation",
                "start": datetime.datetime(2026, 3, 2, 15, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 3, 2, 15, 45, tzinfo=datetime.timezone.utc),
                "reason": "Step-up controller therapy evaluation for uncontrolled nocturnal asthma."
            }
        ],
        "conditions": [
            {"code": "J45.50", "description": "Severe Persistent Bronchial Asthma", "onset": datetime.date(2024, 9, 5)},
            {"code": "J30.1", "description": "Allergic Rhinitis due to environmental allergens", "onset": datetime.date(2023, 6, 12)}
        ],
        "prescriptions": [
            {"name": "Budesonide 160 MCG / Formoterol 4.5 MCG Inhalation (Symbicort)", "dosage": "2 inhalations twice daily", "status": "active"},
            {"name": "Montelukast 10 MG Oral Tablet (Singulair)", "dosage": "1 tablet at bedtime", "status": "active"},
            {"name": "Albuterol Sulfate 90 MCG Inhaler", "dosage": "2 puffs 15 min prior to exercise", "status": "active"}
        ],
        "observations": [
            {"name": "Peak Expiratory Flow Rate (PEF)", "value": "310.0", "units": "L/min", "range": "380-500"},
            {"name": "Total Serum IgE", "value": "410.0", "units": "IU/mL", "range": "0-100"},
            {"name": "Blood Eosinophil Count", "value": "580.0", "units": "cells/uL", "range": "0-500"},
            {"name": "Fractional Exhaled Nitric Oxide (FeNO)", "value": "52.0", "units": "ppb", "range": "< 25"}
        ],
        "allergies": [
            {"allergen": "Dust Mites & Animal Dander", "reaction": "Acute rhinitis & wheezing", "severity": "Moderate"}
        ]
    },

    # --- Category 4: Cardiovascular & Heart Diseases ---
    {
        "first_name": "David",
        "last_name": "Miller",
        "gender": "M",
        "dob": datetime.date(1965, 6, 30),
        "blood_group": "A+",
        "address": "520 Grandview Terrace, Springfield",
        "category": "Cardiovascular & Heart Diseases",
        "encounters": [
            {
                "type": "Cardiac Care Unit Admission & Percutaneous Intervention",
                "start": datetime.datetime(2026, 1, 22, 6, 15, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 1, 26, 14, 0, tzinfo=datetime.timezone.utc),
                "reason": "Acute anterior ST-elevation myocardial infarction; drug-eluting stent placed in LAD."
            }
        ],
        "conditions": [
            {"code": "I21.09", "description": "Acute Anterior STEMI involving Left Anterior Descending Artery", "onset": datetime.date(2026, 1, 22)},
            {"code": "I25.10", "description": "Atherosclerotic Coronary Artery Disease of native arteries", "onset": datetime.date(2025, 2, 10)},
            {"code": "I10", "description": "Essential (primary) Hypertension", "onset": datetime.date(2020, 5, 14)}
        ],
        "prescriptions": [
            {"name": "Aspirin 81 MG Delayed Release Tablet", "dosage": "81mg once daily", "status": "active"},
            {"name": "Ticagrelor 90 MG Oral Tablet (Brilinta)", "dosage": "90mg twice daily with Aspirin", "status": "active"},
            {"name": "Atorvastatin Calcium 80 MG Oral Tablet", "dosage": "80mg once daily at bedtime", "status": "active"},
            {"name": "Metoprolol Succinate 50 MG Extended Release Tablet", "dosage": "50mg once daily in morning", "status": "active"},
            {"name": "Ramipril 5 MG Oral Capsule", "dosage": "5mg once daily", "status": "active"}
        ],
        "observations": [
            {"name": "High-Sensitivity Cardiac Troponin I", "value": "4.82", "units": "ng/mL", "range": "< 0.04"},
            {"name": "Systolic Blood Pressure", "value": "136.0", "units": "mmHg", "range": "90-120"},
            {"name": "Diastolic Blood Pressure", "value": "84.0", "units": "mmHg", "range": "60-80"},
            {"name": "Heart Rate", "value": "68.0", "units": "/min", "range": "60-100"},
            {"name": "LDL Cholesterol", "value": "148.0", "units": "mg/dL", "range": "< 70"},
            {"name": "Left Ventricular Ejection Fraction (LVEF)", "value": "45.0", "units": "%", "range": "55-70"}
        ],
        "allergies": [
            {"allergen": "Codeine Phosphate", "reaction": "Severe nausea and dizziness", "severity": "Moderate"}
        ]
    },
    {
        "first_name": "James",
        "last_name": "Wilson",
        "gender": "M",
        "dob": datetime.date(1954, 12, 8),
        "blood_group": "B+",
        "address": "114 Highland Way, Springfield",
        "category": "Cardiovascular & Heart Diseases",
        "encounters": [
            {
                "type": "Heart Failure Clinic Longitudinal Review",
                "start": datetime.datetime(2026, 2, 15, 10, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 15, 11, 30, tzinfo=datetime.timezone.utc),
                "reason": "Decompensated biventricular failure management; titration of GDMT."
            }
        ],
        "conditions": [
            {"code": "I50.22", "description": "Chronic Systolic Heart Failure with Reduced Ejection Fraction (HFrEF Stage C)", "onset": datetime.date(2025, 1, 14)},
            {"code": "I48.91", "description": "Unspecified Atrial Fibrillation (Chronic persistent)", "onset": datetime.date(2024, 7, 19)}
        ],
        "prescriptions": [
            {"name": "Sacubitril 49 MG / Valsartan 51 MG Tablet (Entresto)", "dosage": "1 tablet twice daily", "status": "active"},
            {"name": "Carvedilol 12.5 MG Oral Tablet", "dosage": "12.5mg twice daily with food", "status": "active"},
            {"name": "Furosemide 40 MG Oral Tablet (Lasix)", "dosage": "40mg every morning", "status": "active"},
            {"name": "Spironolactone 25 MG Oral Tablet", "dosage": "25mg once daily", "status": "active"},
            {"name": "Apixaban 5 MG Oral Tablet (Eliquis)", "dosage": "5mg twice daily", "status": "active"}
        ],
        "observations": [
            {"name": "N-Terminal Pro-BNP (NT-proBNP)", "value": "3420.0", "units": "pg/mL", "range": "< 300.0"},
            {"name": "Left Ventricular Ejection Fraction (LVEF)", "value": "32.0", "units": "%", "range": "55-70"},
            {"name": "Serum Potassium", "value": "4.7", "units": "mEq/L", "range": "3.5-5.0"},
            {"name": "Serum Creatinine", "value": "1.32", "units": "mg/dL", "range": "0.7-1.3"},
            {"name": "Body Weight", "value": "85.2", "units": "kg", "range": "80-85"}
        ],
        "allergies": []
    },

    # --- Category 5: Kidney Diseases (Nephrology) ---
    {
        "first_name": "Elena",
        "last_name": "Rodriguez",
        "gender": "F",
        "dob": datetime.date(1967, 8, 22),
        "blood_group": "O-",
        "address": "405 Meadowbrook Lane, Springfield",
        "category": "Kidney Diseases (Nephrology)",
        "encounters": [
            {
                "type": "Nephrology Subspecialty Consultation",
                "start": datetime.datetime(2026, 2, 10, 11, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 10, 12, 30, tzinfo=datetime.timezone.utc),
                "reason": "Evaluation of rapidly progressing proteinuria and Stage 4 renal insufficiency."
            }
        ],
        "conditions": [
            {"code": "N18.4", "description": "Chronic Kidney Disease Stage 4 (Severe reduction in GFR)", "onset": datetime.date(2024, 11, 20)},
            {"code": "E11.22", "description": "Type 2 Diabetes Mellitus with Diabetic Chronic Kidney Disease", "onset": datetime.date(2018, 3, 10)},
            {"code": "D63.1", "description": "Anemia in Chronic Kidney Disease", "onset": datetime.date(2025, 6, 1)}
        ],
        "prescriptions": [
            {"name": "Losartan Potassium 50 MG Oral Tablet", "dosage": "50mg once daily", "status": "active"},
            {"name": "Empagliflozin 10 MG Oral Tablet (Jardiance)", "dosage": "10mg once daily in morning", "status": "active"},
            {"name": "Sevelamer Carbonate 800 MG Tablet (Renvela)", "dosage": "800mg three times daily with meals", "status": "active"},
            {"name": "Darbepoetin Alfa 40 MCG/0.4 ML Syringe", "dosage": "Subcutaneous injection every 4 weeks", "status": "active"}
        ],
        "observations": [
            {"name": "Serum Creatinine", "value": "3.42", "units": "mg/dL", "range": "0.6-1.1"},
            {"name": "Estimated Glomerular Filtration Rate (eGFR)", "value": "20.5", "units": "mL/min/1.73m2", "range": "> 60"},
            {"name": "Urine Albumin / Creatinine Ratio (uACR)", "value": "1840.0", "units": "mg/g", "range": "< 30"},
            {"name": "Blood Urea Nitrogen (BUN)", "value": "52.0", "units": "mg/dL", "range": "7-20"},
            {"name": "Serum Potassium", "value": "5.1", "units": "mEq/L", "range": "3.5-5.0"},
            {"name": "Hemoglobin", "value": "9.6", "units": "g/dL", "range": "12.0-16.0"}
        ],
        "allergies": [
            {"allergen": "Ibuprofen / NSAIDs", "reaction": "Acute worsening of renal clearance", "severity": "Critical"}
        ]
    },
    {
        "first_name": "Marcus",
        "last_name": "Brody",
        "gender": "M",
        "dob": datetime.date(1960, 4, 14),
        "blood_group": "A+",
        "address": "218 Riverfront Plaza, Springfield",
        "category": "Kidney Diseases (Nephrology)",
        "encounters": [
            {
                "type": "Inpatient Nephrology Consult & Hemodialysis Planning",
                "start": datetime.datetime(2026, 2, 25, 8, 30, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 3, 1, 12, 0, tzinfo=datetime.timezone.utc),
                "reason": "Acute on chronic kidney injury precipitated by volume depletion."
            }
        ],
        "conditions": [
            {"code": "N17.9", "description": "Acute Kidney Injury (AKI KDIGO Stage 2)", "onset": datetime.date(2026, 2, 25)},
            {"code": "N18.30", "description": "Underlying Chronic Kidney Disease Stage 3", "onset": datetime.date(2023, 10, 5)}
        ],
        "prescriptions": [
            {"name": "Sodium Bicarbonate 650 MG Tablet", "dosage": "650mg twice daily for metabolic acidosis", "status": "active"},
            {"name": "Pravastatin Sodium 20 MG Tablet", "dosage": "20mg at bedtime", "status": "active"},
            {"name": "Amlodipine Besylate 5 MG Tablet", "dosage": "5mg once daily", "status": "active"}
        ],
        "observations": [
            {"name": "Serum Creatinine", "value": "3.85", "units": "mg/dL", "range": "0.7-1.3"},
            {"name": "Baseline Creatinine (3 months prior)", "value": "1.65", "units": "mg/dL", "range": "0.7-1.3"},
            {"name": "Blood Urea Nitrogen (BUN)", "value": "58.0", "units": "mg/dL", "range": "8-24"},
            {"name": "Fractional Excretion of Sodium (FENa)", "value": "0.75", "units": "%", "range": "1.0-2.0"},
            {"name": "Serum Bicarbonate (CO2)", "value": "18.0", "units": "mEq/L", "range": "22-29"}
        ],
        "allergies": [
            {"allergen": "Gentamicin Sulfate", "reaction": "Ototoxicity & Nephrotoxicity", "severity": "High"}
        ]
    },

    # --- Patient 11: Jane Smith (Connected to patient login account janesmith) ---
    {
        "first_name": "Jane",
        "last_name": "Smith",
        "gender": "F",
        "dob": datetime.date(1982, 6, 15),
        "blood_group": "O+",
        "address": "142 Maplewood Drive, Springfield",
        "category": "Cardiovascular & Metabolic Diseases",
        "user": jane_user,
        "encounters": [
            {
                "type": "Comprehensive Health & Chronic Disease Review",
                "start": datetime.datetime(2026, 1, 15, 9, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 1, 15, 10, 0, tzinfo=datetime.timezone.utc),
                "reason": "Routine ambulatory monitoring of blood pressure and glycemic markers."
            }
        ],
        "conditions": [
            {"code": "I10", "description": "Essential (primary) Hypertension", "onset": datetime.date(2024, 3, 10)},
            {"code": "E11.9", "description": "Type 2 Diabetes Mellitus without complications", "onset": datetime.date(2025, 1, 18)}
        ],
        "prescriptions": [
            {"name": "Lisinopril 10 MG Oral Tablet", "dosage": "10mg once daily in morning", "status": "active"},
            {"name": "Metformin Hydrochloride 500 MG Tablet", "dosage": "500mg twice daily with food", "status": "active"},
            {"name": "Atorvastatin 20 MG Tablet", "dosage": "20mg daily at bedtime", "status": "active"}
        ],
        "observations": [
            {"name": "Systolic Blood Pressure", "value": "128.0", "units": "mmHg", "range": "90-120"},
            {"name": "Diastolic Blood Pressure", "value": "82.0", "units": "mmHg", "range": "60-80"},
            {"name": "Fasting Blood Glucose", "value": "116.0", "units": "mg/dL", "range": "70-99"},
            {"name": "Hemoglobin A1c (HbA1c)", "value": "6.7", "units": "%", "range": "< 5.7"},
            {"name": "Body Mass Index (BMI)", "value": "26.4", "units": "kg/m2", "range": "18.5-24.9"},
            {"name": "Heart Rate", "value": "72.0", "units": "/min", "range": "60-100"}
        ],
        "allergies": [
            {"allergen": "Amoxicillin / Penicillin", "reaction": "Pruritic rash", "severity": "Moderate"}
        ]
    }
]

print(f"Step 4: Inserting {len(PATIENTS_DATA)} clean clinical patients...")

created_patients = []
for pdata in PATIENTS_DATA:
    patient = Patient.objects.create(
        user=pdata.get("user", None),
        source_id=f"PT-2026-{uuid.uuid4().hex[:8].upper()}",
        first_name=pdata["first_name"],
        last_name=pdata["last_name"],
        gender=pdata["gender"],
        dob=pdata["dob"],
        blood_group=pdata["blood_group"],
        address=pdata["address"],
        primary_hospital=hospital
    )
    # Generate Health ID
    PatientHealthID.objects.create(patient=patient)

    # Automatically grant approved, active AccessGrant to drsmith so they are immediately accessible in Doctor Portal
    AccessGrant.objects.create(
        patient=patient,
        doctor=doctor,
        hospital=hospital,
        scope=["full"],
        purpose=f"Active Clinical Care & Diagnostic Management ({pdata['category']})",
        status="approved",
        expiry_date=timezone.now() + datetime.timedelta(days=365)
    )

    # Create Encounters
    for enc_data in pdata["encounters"]:
        encounter = Encounter.objects.create(
            patient=patient,
            provider=doctor,
            hospital=hospital,
            source_id=f"ENC-{uuid.uuid4().hex[:8].upper()}",
            encounter_type=enc_data["type"],
            start_date=enc_data["start"],
            end_date=enc_data["end"],
            reason=enc_data["reason"]
        )

        # Create Conditions linked to encounter
        for cond_data in pdata["conditions"]:
            Condition.objects.create(
                patient=patient,
                encounter=encounter,
                source_id=f"COND-{uuid.uuid4().hex[:8].upper()}",
                code=cond_data["code"],
                description=cond_data["description"],
                onset_date=cond_data["onset"]
            )

        # Create Prescriptions linked to encounter
        for rx_data in pdata["prescriptions"]:
            Prescription.objects.create(
                patient=patient,
                provider=doctor,
                hospital=hospital,
                encounter=encounter,
                source_id=f"RX-{uuid.uuid4().hex[:8].upper()}",
                medication_name=rx_data["name"],
                dosage=rx_data["dosage"],
                status=rx_data["status"],
                start_date=enc_data["start"]
            )

        # Create Observations linked to encounter
        for obs_data in pdata["observations"]:
            Observation.objects.create(
                patient=patient,
                encounter=encounter,
                source_id=f"OBS-{uuid.uuid4().hex[:8].upper()}",
                test_name=obs_data["name"],
                value=obs_data["value"],
                units=obs_data["units"],
                reference_range=obs_data.get("range", ""),
                status="final",
                date=enc_data["start"]
            )

    # Create Allergies
    for all_data in pdata["allergies"]:
        AllergyRecord.objects.create(
            patient=patient,
            source_id=f"ALL-{uuid.uuid4().hex[:8].upper()}",
            allergen=all_data["allergen"],
            reaction=all_data["reaction"],
            severity=all_data["severity"],
            status="active"
        )

    created_patients.append(patient)

print(f"Created {len(created_patients)} clean patients with complete encounters, conditions, labs, and active doctor consent.")
