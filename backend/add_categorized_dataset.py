import os
import django
import uuid
import datetime
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User, Doctor, Hospital
from patients.models import Patient, PatientHealthID
from records.models import Encounter, Condition, Prescription, Observation, AllergyRecord
from consent.models import AccessGrant

doctor = Doctor.objects.filter(source_id="DOC-SMITH-001").first()
if not doctor:
    doctor = Doctor.objects.first()

hospital = Hospital.objects.first()

# Additional realistic datasets across the 5 categories (10 new patients, 2 per category)
ADDITIONAL_PATIENTS = [
    # 1. Infectious & Communicable Diseases
    {
        "first_name": "Tariq",
        "last_name": "Al-Mansoor",
        "gender": "M",
        "dob": datetime.date(1989, 4, 17),
        "blood_group": "B+",
        "address": "774 Cedar Grove Ln, Springfield",
        "category": "Infectious & Communicable Diseases",
        "encounters": [
            {
                "type": "Infectious Disease Ambulatory Clinic",
                "start": datetime.datetime(2026, 3, 10, 10, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 3, 10, 11, 0, tzinfo=datetime.timezone.utc),
                "reason": "Antiviral efficacy monitoring for chronic viral hepatitis B infection."
            }
        ],
        "conditions": [
            {"code": "B18.1", "description": "Chronic Viral Hepatitis B without Delta-Agent", "onset": datetime.date(2025, 5, 20)},
            {"code": "K76.0", "description": "Hepatic Steatosis (Fatty Liver Disease)", "onset": datetime.date(2024, 8, 12)}
        ],
        "prescriptions": [
            {"name": "Tenofovir Disoproxil Fumarate 300 MG Oral Tablet", "dosage": "300mg once daily with water", "status": "active"},
            {"name": "Silymarin / Milk Thistle 140 MG Capsule", "dosage": "Twice daily dietary support", "status": "active"}
        ],
        "observations": [
            {"name": "Hepatitis B DNA Viral Load (HBV DNA)", "value": "180.0", "units": "IU/mL", "range": "< 20.0 (Undetectable)"},
            {"name": "Alanine Aminotransferase (ALT)", "value": "42.0", "units": "U/L", "range": "7-56"},
            {"name": "Aspartate Aminotransferase (AST)", "value": "38.0", "units": "U/L", "range": "10-40"},
            {"name": "Serum Total Bilirubin", "value": "0.9", "units": "mg/dL", "range": "0.2-1.2"},
            {"name": "Alpha-Fetoprotein (AFP)", "value": "4.2", "units": "ng/mL", "range": "0.0-8.5"}
        ],
        "allergies": [
            {"allergen": "Sulfa Drugs", "reaction": "Skin rash and pruritus", "severity": "Moderate"}
        ]
    },
    {
        "first_name": "Lila",
        "last_name": "Nakamura",
        "gender": "F",
        "dob": datetime.date(1995, 11, 23),
        "blood_group": "A-",
        "address": "312 Blossom Way, Springfield",
        "category": "Infectious & Communicable Diseases",
        "encounters": [
            {
                "type": "Urgent Care Clinic Consultation",
                "start": datetime.datetime(2026, 2, 28, 14, 30, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 28, 15, 30, tzinfo=datetime.timezone.utc),
                "reason": "Recurrent high spikes of fever, severe myalgia, and retro-orbital headache."
            }
        ],
        "conditions": [
            {"code": "A90", "description": "Dengue Fever with Warning Signs (Acute Viral)", "onset": datetime.date(2026, 2, 27)},
            {"code": "D69.6", "description": "Acute Thrombocytopenia secondary to viral infection", "onset": datetime.date(2026, 2, 28)}
        ],
        "prescriptions": [
            {"name": "Acetaminophen 650 MG Oral Tablet", "dosage": "650mg every 6 hours PRN fever (Max 3000mg/day)", "status": "active"},
            {"name": "Oral Rehydration Salts (ORS) Solution", "dosage": "1 packet in 1L water consumed over 12 hours", "status": "active"}
        ],
        "observations": [
            {"name": "Platelet Count", "value": "78.0", "units": "10*3/uL", "range": "150-450"},
            {"name": "Hematocrit (HCT)", "value": "44.2", "units": "%", "range": "36.0-46.0"},
            {"name": "Dengue NS1 Antigen", "value": "Positive", "units": "{qualitative}", "range": "Negative"},
            {"name": "Body Temperature", "value": "101.8", "units": "deg F", "range": "97.0-99.0"}
        ],
        "allergies": []
    },

    # 2. Cancers (Oncology)
    {
        "first_name": "Gregory",
        "last_name": "Hayes",
        "gender": "M",
        "dob": datetime.date(1956, 8, 14),
        "blood_group": "O+",
        "address": "810 Whispering Pines Rd, Springfield",
        "category": "Cancers (Oncology)",
        "encounters": [
            {
                "type": "Urologic Oncology Clinic",
                "start": datetime.datetime(2026, 3, 5, 9, 30, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 3, 5, 11, 0, tzinfo=datetime.timezone.utc),
                "reason": "Androgen deprivation therapy surveillance for prostate adenocarcinoma."
            }
        ],
        "conditions": [
            {"code": "C61", "description": "Malignant Neoplasm of Prostate (Adenocarcinoma Gleason 7 / Grade Group 3)", "onset": datetime.date(2025, 4, 18)},
            {"code": "N40.1", "description": "Benign Prostatic Hyperplasia with lower urinary tract symptoms", "onset": datetime.date(2023, 2, 11)}
        ],
        "prescriptions": [
            {"name": "Leuprolide Acetate 22.5 MG 3-Month Depot", "dosage": "Intramuscular injection every 12 weeks", "status": "active"},
            {"name": "Bicalutamide 50 MG Oral Tablet", "dosage": "50mg once daily oral", "status": "active"},
            {"name": "Tamsulosin Hydrochloride 0.4 MG Capsule", "dosage": "0.4mg daily after dinner", "status": "active"}
        ],
        "observations": [
            {"name": "Prostate Specific Antigen (Total PSA)", "value": "2.1", "units": "ng/mL", "range": "< 4.0"},
            {"name": "Serum Testosterone (Total)", "value": "18.0", "units": "ng/dL", "range": "< 50 (Castrate Level)"},
            {"name": "Serum Alkaline Phosphatase", "value": "72.0", "units": "U/L", "range": "44-147"}
        ],
        "allergies": [
            {"allergen": "Ciprofloxacin", "reaction": "Tendon pain and stiffness", "severity": "Moderate"}
        ]
    },
    {
        "first_name": "Claire",
        "last_name": "Dubois",
        "gender": "F",
        "dob": datetime.date(1978, 6, 9),
        "blood_group": "A+",
        "address": "402 Birchwood Avenue, Springfield",
        "category": "Cancers (Oncology)",
        "encounters": [
            {
                "type": "Hematology / Oncology Infusion Suite",
                "start": datetime.datetime(2026, 2, 18, 8, 30, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 18, 14, 0, tzinfo=datetime.timezone.utc),
                "reason": "Cycle 4 immunochemotherapy for diffuse large B-cell lymphoma."
            }
        ],
        "conditions": [
            {"code": "C83.30", "description": "Diffuse Large B-Cell Lymphoma (DLBCL Stage II)", "onset": datetime.date(2025, 11, 8)},
            {"code": "R53.83", "description": "Cancer-related generalized fatigue and weakness", "onset": datetime.date(2025, 11, 1)}
        ],
        "prescriptions": [
            {"name": "Rituximab 375 MG/M2 Injection", "dosage": "IV infusion every 21 days", "status": "active"},
            {"name": "Cyclophosphamide / Doxorubicin / Vincristine / Prednisone (R-CHOP)", "dosage": "Cyclic protocol", "status": "active"},
            {"name": "Pegfilgrastim 6 MG/0.6 ML Subcutaneous Syringe (Neulasta)", "dosage": "6mg SQ 24h post-chemotherapy", "status": "active"},
            {"name": "Acyclovir 400 MG Oral Tablet", "dosage": "Twice daily viral prophylaxis", "status": "active"}
        ],
        "observations": [
            {"name": "Lactate Dehydrogenase (LDH)", "value": "215.0", "units": "U/L", "range": "140-280"},
            {"name": "Absolute Neutrophil Count (ANC)", "value": "2.4", "units": "10*3/uL", "range": "1.5-8.0"},
            {"name": "Hemoglobin", "value": "11.2", "units": "g/dL", "range": "12.0-16.0"}
        ],
        "allergies": []
    },

    # 3. Respiratory Diseases
    {
        "first_name": "Kenneth",
        "last_name": "O'Connor",
        "gender": "M",
        "dob": datetime.date(1952, 1, 29),
        "blood_group": "AB-",
        "address": "156 Harbor Point Dr, Springfield",
        "category": "Respiratory Diseases",
        "encounters": [
            {
                "type": "Interstitial Lung Disease Center Consultation",
                "start": datetime.datetime(2026, 3, 1, 11, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 3, 1, 12, 30, tzinfo=datetime.timezone.utc),
                "reason": "Exertional desaturation and chronic non-productive dry cough."
            }
        ],
        "conditions": [
            {"code": "J84.112", "description": "Idiopathic Pulmonary Fibrosis (IPF, Usual Interstitial Pneumonia pattern)", "onset": datetime.date(2025, 3, 12)},
            {"code": "R06.02", "description": "Shortness of Breath on minimal exertion (Dyspnea on exertion)", "onset": datetime.date(2024, 11, 15)}
        ],
        "prescriptions": [
            {"name": "Pirfenidone 267 MG Oral Capsule (Esbriet)", "dosage": "801mg (3 capsules) three times daily with food", "status": "active"},
            {"name": "Supplemental Home Oxygen Therapy", "dosage": "2 Liters/min via nasal cannula on exertion", "status": "active"},
            {"name": "Omeprazole 20 MG Delayed Release Capsule", "dosage": "20mg daily for GERD-associated microaspiration", "status": "active"}
        ],
        "observations": [
            {"name": "Forced Vital Capacity (FVC % Predicted)", "value": "62.0", "units": "%", "range": "> 80.0"},
            {"name": "Diffusing Capacity of Lungs for Carbon Monoxide (DLCO)", "value": "48.0", "units": "%", "range": "> 75.0"},
            {"name": "Six-Minute Walk Distance (6MWD)", "value": "340.0", "units": "meters", "range": "400-700"},
            {"name": "Resting Pulse Oximetry (SpO2 on Room Air)", "value": "92.0", "units": "%", "range": "95-100"}
        ],
        "allergies": []
    },
    {
        "first_name": "Maya",
        "last_name": "Lin",
        "gender": "F",
        "dob": datetime.date(1985, 9, 3),
        "blood_group": "O+",
        "address": "620 Sycamore Terrace, Springfield",
        "category": "Respiratory Diseases",
        "encounters": [
            {
                "type": "Sleep Medicine & Pulmonary Lab Visit",
                "start": datetime.datetime(2026, 2, 22, 13, 30, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 22, 14, 45, tzinfo=datetime.timezone.utc),
                "reason": "PAP compliance and treatment review for severe obstructive sleep apnea."
            }
        ],
        "conditions": [
            {"code": "G47.33", "description": "Severe Obstructive Sleep Apnea (OSA, AHI 34.2 events/hr)", "onset": datetime.date(2025, 7, 19)},
            {"code": "R53.83", "description": "Excessive Daytime Sleepiness (Epworth Score 16)", "onset": datetime.date(2025, 5, 2)}
        ],
        "prescriptions": [
            {"name": "Auto-Titrating CPAP (APAP Therapy)", "dosage": "Pressure range 9 - 15 cm H2O nightly", "status": "active"},
            {"name": "Fluticasone Propionate 50 MCG Nasal Spray", "dosage": "2 sprays per nostril once daily", "status": "active"}
        ],
        "observations": [
            {"name": "Apnea-Hypopnea Index (AHI on CPAP)", "value": "2.4", "units": "events/hr", "range": "< 5.0 (Controlled)"},
            {"name": "Nightly CPAP Device Adherence", "value": "94.0", "units": "% nights used > 4hr", "range": "> 70.0"},
            {"name": "Mean Nocturnal SpO2", "value": "96.0", "units": "%", "range": "> 92.0"}
        ],
        "allergies": [
            {"allergen": "Latex", "reaction": "Contact dermatitis", "severity": "Moderate"}
        ]
    },

    # 4. Cardiovascular & Heart Diseases
    {
        "first_name": "Suresh",
        "last_name": "Menon",
        "gender": "M",
        "dob": datetime.date(1968, 12, 1),
        "blood_group": "B+",
        "address": "905 Crestview Blvd, Springfield",
        "category": "Cardiovascular & Heart Diseases",
        "encounters": [
            {
                "type": "Cardiovascular Disease Outpatient Review",
                "start": datetime.datetime(2026, 3, 12, 10, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 3, 12, 11, 15, tzinfo=datetime.timezone.utc),
                "reason": "Subacute chest tightness on exertion; stable ischemic coronary heart disease."
            }
        ],
        "conditions": [
            {"code": "I20.8", "description": "Chronic Stable Angina Pectoris (CCS Class II)", "onset": datetime.date(2025, 8, 14)},
            {"code": "I25.10", "description": "Atherosclerotic Coronary Artery Disease with Moderate LAD Stenosis", "onset": datetime.date(2025, 8, 14)},
            {"code": "E78.0", "description": "Pure Hypercholesterolemia (Dyslipidemia)", "onset": datetime.date(2020, 10, 5)}
        ],
        "prescriptions": [
            {"name": "Isosorbide Mononitrate 30 MG Extended Release Tablet", "dosage": "30mg once daily in morning", "status": "active"},
            {"name": "Nitroglycerin 0.4 MG Sublingual Tablet", "dosage": "1 tablet under tongue PRN acute angina pain", "status": "active"},
            {"name": "Rosuvastatin Calcium 40 MG Oral Tablet (Crestor)", "dosage": "40mg daily at bedtime", "status": "active"},
            {"name": "Bisoprolol Fumarate 5 MG Oral Tablet", "dosage": "5mg once daily", "status": "active"}
        ],
        "observations": [
            {"name": "Total Cholesterol", "value": "195.0", "units": "mg/dL", "range": "< 200"},
            {"name": "LDL-C (Low-Density Lipoprotein)", "value": "64.0", "units": "mg/dL", "range": "< 70"},
            {"name": "High-Sensitivity CRP (hs-CRP)", "value": "1.8", "units": "mg/L", "range": "< 2.0"},
            {"name": "Resting Heart Rate", "value": "62.0", "units": "bpm", "range": "55-75"}
        ],
        "allergies": []
    },
    {
        "first_name": "Hannah",
        "last_name": "Zimmerman",
        "gender": "F",
        "dob": datetime.date(1973, 5, 16),
        "blood_group": "O-",
        "address": "488 Willow Springs Rd, Springfield",
        "category": "Cardiovascular & Heart Diseases",
        "encounters": [
            {
                "type": "Cardiac Electrophysiology Follow-Up",
                "start": datetime.datetime(2026, 2, 17, 14, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 17, 15, 0, tzinfo=datetime.timezone.utc),
                "reason": "Holter monitor check and stroke prevention review for paroxysmal atrial fibrillation."
            }
        ],
        "conditions": [
            {"code": "I48.0", "description": "Paroxysmal Atrial Fibrillation with Rapid Ventricular Response episodes", "onset": datetime.date(2025, 6, 24)},
            {"code": "I10", "description": "Essential (primary) Hypertension", "onset": datetime.date(2021, 4, 19)}
        ],
        "prescriptions": [
            {"name": "Rivaroxaban 20 MG Oral Tablet (Xarelto)", "dosage": "20mg once daily with evening meal", "status": "active"},
            {"name": "Diltiazem Hydrochloride 180 MG Extended Release (Cardizem CD)", "dosage": "180mg once daily in morning", "status": "active"},
            {"name": "Valsartan 80 MG Oral Tablet", "dosage": "80mg once daily", "status": "active"}
        ],
        "observations": [
            {"name": "CHA2DS2-VASc Stroke Risk Score", "value": "3.0", "units": "{points}", "range": "0-9"},
            {"name": "Electrocardiogram (ECG rhythm)", "value": "Normal Sinus Rhythm with rare PACs", "units": "{text}", "range": "NSR"},
            {"name": "Systolic Blood Pressure", "value": "124.0", "units": "mmHg", "range": "90-120"},
            {"name": "Diastolic Blood Pressure", "value": "78.0", "units": "mmHg", "range": "60-80"}
        ],
        "allergies": [
            {"allergen": "Amiodarone", "reaction": "Corneal microdeposits & photosensitivity", "severity": "High"}
        ]
    },

    # 5. Kidney Diseases (Nephrology)
    {
        "first_name": "Daniel",
        "last_name": "Kowalski",
        "gender": "M",
        "dob": datetime.date(1975, 10, 11),
        "blood_group": "A-",
        "address": "267 Lakeview Drive, Springfield",
        "category": "Kidney Diseases (Nephrology)",
        "encounters": [
            {
                "type": "Nephrology Clinic & Genetic Kidney Disease Consult",
                "start": datetime.datetime(2026, 3, 8, 10, 30, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 3, 8, 11, 45, tzinfo=datetime.timezone.utc),
                "reason": "Tolvaptan titration and kidney volume monitoring for autosomal dominant polycystic kidneys."
            }
        ],
        "conditions": [
            {"code": "Q61.2", "description": "Autosomal Dominant Polycystic Kidney Disease (ADPKD, Mayo Class 1C)", "onset": datetime.date(2023, 1, 15)},
            {"code": "I15.1", "description": "Hypertension secondary to other renal disorders", "onset": datetime.date(2023, 2, 2)}
        ],
        "prescriptions": [
            {"name": "Tolvaptan 45 MG Morning / 15 MG Evening Tablet (Jynarque)", "dosage": "Split-dose protocol with high fluid intake", "status": "active"},
            {"name": "Telmisartan 80 MG Oral Tablet", "dosage": "80mg once daily for renal protection", "status": "active"},
            {"name": "Sodium Bicarbonate 650 MG Tablet", "dosage": "1 tablet twice daily", "status": "active"}
        ],
        "observations": [
            {"name": "Total Kidney Volume (Height-Adjusted TKV)", "value": "890.0", "units": "mL/m", "range": "< 400.0"},
            {"name": "Serum Creatinine", "value": "1.74", "units": "mg/dL", "range": "0.7-1.3"},
            {"name": "Estimated GFR (eGFR CKD-EPI)", "value": "47.0", "units": "mL/min/1.73m2", "range": "> 60"},
            {"name": "Serum Sodium", "value": "141.0", "units": "mEq/L", "range": "135-145"},
            {"name": "Urine Specific Gravity", "value": "1.006", "units": "{ratio}", "range": "1.005-1.030"}
        ],
        "allergies": []
    },
    {
        "first_name": "Fatima",
        "last_name": "Zahra",
        "gender": "F",
        "dob": datetime.date(1991, 7, 28),
        "blood_group": "B+",
        "address": "519 Magnolia Court, Springfield",
        "category": "Kidney Diseases (Nephrology)",
        "encounters": [
            {
                "type": "Glomerular Diseases Subspecialty Clinic",
                "start": datetime.datetime(2026, 2, 26, 11, 0, tzinfo=datetime.timezone.utc),
                "end": datetime.datetime(2026, 2, 26, 12, 15, tzinfo=datetime.timezone.utc),
                "reason": "Evaluation of recurrent microscopic hematuria and macroscopic dark urine post-URI."
            }
        ],
        "conditions": [
            {"code": "N02.8", "description": "IgA Nephropathy (Berger's Disease, Oxford M1E0S1T0)", "onset": datetime.date(2025, 9, 30)},
            {"code": "R31.0", "description": "Gross (macroscopic) hematuria", "onset": datetime.date(2025, 9, 28)}
        ],
        "prescriptions": [
            {"name": "Budesonide Targeted-Release 4 MG Capsule (Tarpeyo)", "dosage": "16mg once daily in morning with water", "status": "active"},
            {"name": "Dapagliflozin 10 MG Oral Tablet (Farxiga)", "dosage": "10mg once daily", "status": "active"},
            {"name": "Omega-3 Acid Ethyl Esters 1000 MG Capsule (Lovaza)", "dosage": "2 grams twice daily with meals", "status": "active"}
        ],
        "observations": [
            {"name": "24-Hour Urine Protein", "value": "1120.0", "units": "mg/24hr", "range": "< 150.0"},
            {"name": "Urine Red Blood Cells (RBCs)", "value": "> 50 (Dysmorphic)", "units": "/HPF", "range": "0-3"},
            {"name": "Serum Creatinine", "value": "1.12", "units": "mg/dL", "range": "0.6-1.1"},
            {"name": "Estimated GFR (eGFR)", "value": "68.0", "units": "mL/min/1.73m2", "range": "> 60"}
        ],
        "allergies": [
            {"allergen": "Penicillin V Potassium", "reaction": "Anaphylaxis and angioedema", "severity": "Critical"}
        ]
    }
]

added_count = 0
for pdata in ADDITIONAL_PATIENTS:
    # Check if patient already exists
    if Patient.objects.filter(first_name=pdata["first_name"], last_name=pdata["last_name"]).exists():
        continue

    source_id = f"PT-{uuid.uuid4().hex[:8].upper()}"
    patient = Patient.objects.create(
        source_id=source_id,
        first_name=pdata["first_name"],
        last_name=pdata["last_name"],
        gender=pdata["gender"],
        dob=pdata["dob"],
        blood_group=pdata["blood_group"],
        address=pdata["address"],
        primary_hospital=hospital
    )
    PatientHealthID.objects.create(patient=patient)

    # Auto grant access to all doctors
    for doc in Doctor.objects.all():
        AccessGrant.objects.create(
            patient=patient,
            doctor=doc,
            hospital=hospital,
            scope=["full"],
            purpose=f"Active Clinical Care & Diagnostic Management ({pdata['category']})",
            status="approved",
            expiry_date=timezone.now() + datetime.timedelta(days=365)
        )

    # Encounters, conditions, prescriptions, observations
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

        for cond_data in pdata["conditions"]:
            Condition.objects.create(
                patient=patient,
                encounter=encounter,
                source_id=f"COND-{uuid.uuid4().hex[:8].upper()}",
                code=cond_data["code"],
                description=cond_data["description"],
                onset_date=cond_data["onset"]
            )

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

    for all_data in pdata["allergies"]:
        AllergyRecord.objects.create(
            patient=patient,
            source_id=f"ALL-{uuid.uuid4().hex[:8].upper()}",
            allergen=all_data["allergen"],
            reaction=all_data["reaction"],
            severity=all_data["severity"],
            status="active"
        )

    added_count += 1

print(f"Successfully added {added_count} new realistic patients across all 5 disease categories.")
print(f"Total patient count in database is now: {Patient.objects.count()}")
