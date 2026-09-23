from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import datetime
import io

app = FastAPI(title='MediLink AI Engine')

class ClinicalData(BaseModel):
    patient_age: Optional[int] = 40
    conditions: List[str] = []
    medications: List[str] = []
    observations: List[dict] = []
    allergies: List[str] = []
    encounters: List[dict] = []

@app.post("/analyze/")
async def analyze_patient(data: ClinicalData):
    insights = []
    
    meds = [m.lower() for m in data.medications]
    conds = [c.lower() for c in data.conditions]
    allergies = [a.lower() for a in data.allergies]

    # 1. Drug Interaction Check (Rule-based)
    # Based on curated list of known interactions
    interaction_pairs = [
        ({"lisinopril", "spironolactone"}, "Potential hyperkalemia risk detected between Lisinopril and Spironolactone.", "WARNING"),
        ({"warfarin", "aspirin"}, "High bleeding risk detected between Warfarin and Aspirin.", "ALERT"),
        ({"simvastatin", "amiodarone"}, "Increased risk of myopathy/rhabdomyolysis.", "WARNING"),
    ]
    for pair, msg, severity in interaction_pairs:
        if all(any(drug in m for m in meds) for drug in pair):
            insights.append({
                "type": severity,
                "category": "Drug Interaction",
                "message": msg,
                "basis": "Rule-based: Curated interaction table"
            })

    # 2. Drug Allergy Detection (Rule-based)
    for allergy in allergies:
        if any(allergy in m for m in meds):
            insights.append({
                "type": "ALERT",
                "category": "Allergy Alert",
                "message": f"Patient is prescribed {allergy} but has a documented allergy to it.",
                "basis": "Rule-based: Direct medication to allergy match"
            })

    # 3. Disease Risk Prediction (Rule-based)
    has_htn = any("hypertension" in c for c in conds)
    bmi = None
    weight = next((o['value'] for o in data.observations if 'weight' in o['test_name'].lower()), None)
    height = next((o['value'] for o in data.observations if 'height' in o['test_name'].lower()), None)
    if weight and height:
        try:
            h_m = float(height) / 100
            bmi = float(weight) / (h_m * h_m)
        except:
            pass

    if has_htn and bmi and bmi > 25:
        insights.append({
            "type": "WARNING",
            "category": "Disease Prediction",
            "message": f"High risk for Type 2 Diabetes (BMI: {bmi:.1f} + Hypertension). Recommend HbA1c screening.",
            "basis": "Rule-based: Co-occurrence of HTN and BMI > 25"
        })

    # 4. Duplicate Prescription Detection (Rule-based)
    seen_meds = set()
    for m in meds:
        if m in seen_meds:
            insights.append({
                "type": "WARNING",
                "category": "Duplicate Rx",
                "message": f"Duplicate active prescription found for {m}.",
                "basis": "Rule-based: Exact string match of active prescriptions"
            })
        seen_meds.add(m)

    # 5. Duplicate Lab Test Detection (Rule-based)
    import datetime
    lab_dates = {}
    for o in data.observations:
        test_name = o['test_name'].lower()
        date_str = o.get('date')
        if date_str:
            lab_dates.setdefault(test_name, []).append(date_str)
            
    for test, dates in lab_dates.items():
        if len(dates) > 1:
            insights.append({
                "type": "INFO",
                "category": "Duplicate Lab",
                "message": f"Test '{test}' has been performed multiple times.",
                "basis": "Rule-based: Duplicate observation names"
            })

    # 6. Emergency Risk Prediction (Rule-based)
    abnormal_vitals = 0
    hr = next((o['value'] for o in data.observations if 'heart rate' in o['test_name'].lower()), None)
    if hr:
        try:
            if float(hr) > 120 or float(hr) < 50: abnormal_vitals += 1
        except: pass

    if abnormal_vitals > 0 or any("emergency" in c for c in conds):
        insights.append({
            "type": "ALERT",
            "category": "Emergency Risk",
            "message": "Patient exhibits signs of critical instability based on recent vitals or conditions.",
            "basis": "Rule-based: Vital sign thresholding"
        })

    if not insights:
        insights.append({
            "type": "INFO",
            "category": "General",
            "message": "No critical AI insights generated for this patient profile at this time.",
            "basis": "Rule-based"
        })

    return {"insights": insights}


class TimelineEvent(BaseModel):
    id: str
    type: str
    date: str
    title: str
    description: str

class TimelineBundle(BaseModel):
    events: List[TimelineEvent]

@app.post("/timeline/")
async def generate_timeline(bundle: TimelineBundle):
    # 7. Medical Timeline Generation
    # Normalizes and sorts the already-scoped bundle of records
    events = bundle.events
    events.sort(key=lambda x: x.date, reverse=True)
    return {"timeline": [e.dict() for e in events], "basis": "Rule-based: Chronological sort"}


@app.post("/ocr/")
async def extract_ocr(file: UploadFile = File(...)):
    # 8. OCR extraction using Tesseract
    try:
        import pytesseract
        from PIL import Image
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        text = pytesseract.image_to_string(image)
        
        return {
            "text": text,
            "confidence": "Low",
            "disclaimer": "OCR extraction requires human confirmation before being treated as authoritative."
        }
    except Exception as e:
        return {"error": str(e)}

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    patient_context: dict

@app.post("/chat/")
async def chat_with_assistant(req: ChatRequest):
    # Simulated Conversational AI for Healthcare
    user_message = req.messages[-1].content.lower()
    
    # Context-aware follow-ups based on history
    if len(req.messages) >= 3:
        prev_bot_message = req.messages[-2].content.lower()
        if "what is your current temperature" in prev_bot_message:
            import re
            temp_match = re.search(r'(\d{2,3}(\.\d+)?)', user_message)
            if temp_match:
                temp = float(temp_match.group(1))
                if temp > 103:
                    return {"reply": f"A temperature of {temp}°F is critically high. I strongly recommend visiting the Emergency Room immediately, or booking an urgent appointment with Dr. Sarah Smith (General Medicine)."}
                elif temp > 100.4:
                    return {"reply": f"A temperature of {temp}°F indicates a fever. You may consider taking over-the-counter fever reducers like Acetaminophen (Tylenol) for temporary relief. Please book an appointment with a General Physician if it persists for more than 48 hours."}
                else:
                    return {"reply": f"{temp}°F is generally considered normal. Make sure you get plenty of rest and stay hydrated."}
            else:
                return {"reply": "I couldn't quite catch the number. Could you please specify your temperature in Fahrenheit (e.g., 101.5)?"}
    
    # Keyword-based mock responses
    if "fever" in user_message or "temperature" in user_message:
        response = "I can help with that. Could you please tell me what your current temperature is?"
    elif "blood pressure" in user_message or "htn" in user_message or "hypertension" in user_message:
        response = "Based on your medical records, you have a history of Hypertension. It's important to monitor your blood pressure regularly, reduce sodium intake, and take your prescribed medications like Lisinopril as directed."
    elif "medication" in user_message or "pill" in user_message or "drug" in user_message:
        response = "I can see your active medications. Please make sure you take them exactly as prescribed by your doctor. Do you have a specific question about side effects or dosages?"
    elif "allergy" in user_message or "allergic" in user_message:
        response = "I have noted your allergies in your profile. I will always cross-reference any new medications against this list to prevent adverse reactions."
    elif "hello" in user_message or "hi" in user_message:
        response = "Hello! I am your personal AI Health Assistant. I have full knowledge of your medical history, labs, and prescriptions. How can I assist you with your health today?"
    elif "diet" in user_message or "food" in user_message:
        response = "A balanced diet is crucial. Given your profile, I recommend a heart-healthy diet rich in vegetables, lean proteins, and whole grains, while minimizing processed foods and added sugars."
    else:
        response = "I understand. As an AI health assistant, I can help explain your lab results, provide information on your conditions, or give general wellness advice based on your medical history. What specific area would you like to focus on?"
        
    return {"reply": response}


class DoctorDiagnosisRequest(BaseModel):
    prompt: str
    patient_id: Optional[str] = None
    patient_name: Optional[str] = "Patient"
    patient_age: Optional[int] = 45
    gender: Optional[str] = "Unknown"
    conditions: List[str] = []
    medications: List[str] = []
    allergies: List[str] = []
    observations: List[dict] = []
    encounters: List[dict] = []


DISEASE_KNOWLEDGE_BASE = [
    {
        "id": "ACS_MI",
        "name": "Acute Coronary Syndrome / Myocardial Infarction",
        "category": "Cardiovascular",
        "keywords": ["chest pain", "chest pressure", "chest tightness", "arm pain", "jaw pain", "radiation", "sweating", "diaphoresis", "shortness of breath", "dyspnea", "angina", "substernal", "crushing"],
        "history_risk": ["hypertension", "diabetes", "hyperlipidemia", "coronary", "cad", "atherosclerosis", "smoker", "smoking"],
        "red_flag": True,
        "emergency_alert": "Urgent Rule-Out: Immediate 12-lead ECG and Serial Cardiac Biomarkers required.",
        "rationale_template": "Presents with acute ischemic chest symptoms with high risk factors from cardiovascular history.",
        "recommended_tests": [
            {"test": "12-Lead Electrocardiogram (ECG)", "urgency": "Immediate / Stat", "reason": "Evaluate for ST elevation (STEMI) or ischemic T-wave inversions"},
            {"test": "Serial High-Sensitivity Troponin I / T", "urgency": "Stat at 0h, 1h/3h", "reason": "Detect myocardial necrosis"},
            {"test": "Echocardiography (TTE)", "urgency": "Urgent", "reason": "Assess regional wall motion abnormalities and ejection fraction"}
        ]
    },
    {
        "id": "CHF_EXAC",
        "name": "Congestive Heart Failure Exacerbation",
        "category": "Cardiovascular",
        "keywords": ["shortness of breath", "dyspnea", "orthopnea", "edema", "swelling", "swollen feet", "swollen ankles", "weight gain", "pnd", "nocturnal dyspnea", "crackles", "fatigue", "distention"],
        "history_risk": ["heart failure", "chf", "hypertension", "cardiomyopathy", "infarction", "myocardial"],
        "red_flag": False,
        "emergency_alert": None,
        "rationale_template": "Signs of fluid overload and progressive exertional/orthopneic dyspnea correlating with past cardiovascular disease.",
        "recommended_tests": [
            {"test": "Serum NT-proBNP or BNP", "urgency": "Urgent", "reason": "Confirm volume overload and neurohormonal activation"},
            {"test": "Chest X-Ray (PA & Lateral)", "urgency": "Urgent", "reason": "Check for cardiomegaly, pulmonary vascular congestion, and Kerley B lines"},
            {"test": "Basic Metabolic Panel & Electrolytes", "urgency": "Routine", "reason": "Check renal function (BUN/Cr) and potassium prior to diuretic adjustments"}
        ]
    },
    {
        "id": "PNEUMONIA",
        "name": "Community-Acquired / Bacterial Pneumonia",
        "category": "Pulmonary / Infectious",
        "keywords": ["cough", "productive cough", "fever", "chills", "sputum", "pleuritic", "chest pain", "shortness of breath", "dyspnea", "crackles", "purulent", "tachycardia"],
        "history_risk": ["asthma", "copd", "bronchitis", "smoking", "smoker", "immunocompromised"],
        "red_flag": False,
        "emergency_alert": None,
        "rationale_template": "Triad of fever, cough/sputum, and localized respiratory distress suggestive of lower respiratory tract infection.",
        "recommended_tests": [
            {"test": "Chest Radiography (CXR)", "urgency": "Prompt", "reason": "Identify localized alveolar consolidations or infiltrates"},
            {"test": "Complete Blood Count (CBC) with Differential", "urgency": "Prompt", "reason": "Detect leukocytosis with left shift (neutrophilia)"},
            {"test": "Sputum Gram Stain & Culture", "urgency": "Prior to antibiotics", "reason": "Isolate pathogenic organism and antibiotic sensitivities"},
            {"test": "Serum CRP or Procalcitonin", "urgency": "Routine", "reason": "Quantify systemic inflammatory and bacterial burden"}
        ]
    },
    {
        "id": "COPD_ASTHMA_EXAC",
        "name": "Bronchial Asthma / COPD Exacerbation",
        "category": "Pulmonary",
        "keywords": ["wheezing", "shortness of breath", "dyspnea", "chest tightness", "cough", "stridor", "exertion", "bronchospasm"],
        "history_risk": ["asthma", "copd", "bronchitis", "allergies", "rhinitis", "smoking"],
        "red_flag": False,
        "emergency_alert": None,
        "rationale_template": "Expiratory wheezing, dyspnea, and bronchospastic symptoms on a background of chronic reactive airway disease.",
        "recommended_tests": [
            {"test": "Peak Expiratory Flow Rate (PEFR) / Spirometry", "urgency": "Immediate bedside", "reason": "Quantify airflow obstruction and bronchodilator response"},
            {"test": "Continuous Pulse Oximetry (SpO2)", "urgency": "Continuous", "reason": "Monitor hypoxemia; consider supplemental oxygen if SpO2 < 92%"},
            {"test": "Arterial Blood Gas (ABG)", "urgency": "If severe/exhausted", "reason": "Assess hypercapnia and respiratory acid-base balance"}
        ]
    },
    {
        "id": "PULM_EMBOLISM",
        "name": "Pulmonary Embolism (PE)",
        "category": "Pulmonary / Vascular",
        "keywords": ["sudden dyspnea", "sudden shortness of breath", "pleuritic", "sharp chest pain", "hemoptysis", "leg swelling", "calf pain", "tachycardia", "tachypnea", "dvt"],
        "history_risk": ["dvt", "thrombosis", "embolism", "cancer", "surgery", "immobilization", "oral contraceptive"],
        "red_flag": True,
        "emergency_alert": "Urgent Rule-Out: Sudden onset pleuritic chest pain/tachypnea warrants Wells Score and CTPA.",
        "rationale_template": "Acute acute-onset dyspnea with pleuritic chest pain and hemodynamic/tachypneic signs.",
        "recommended_tests": [
            {"test": "CT Pulmonary Angiography (CTPA)", "urgency": "Stat / Urgent", "reason": "Gold standard to visualize intraluminal pulmonary arterial filling defects"},
            {"test": "Quantitative D-Dimer Test", "urgency": "Prompt (if low/mod probability)", "reason": "High negative predictive value to rule out thrombosis"},
            {"test": "Duplex Ultrasound of Lower Extremities", "urgency": "Urgent", "reason": "Detect source deep vein thrombosis (DVT)"}
        ]
    },
    {
        "id": "T2D_HYPERGLYCEMIA",
        "name": "Decompensated Hyperglycemia / Diabetes Mellitus Type 2",
        "category": "Endocrine & Metabolic",
        "keywords": ["polyuria", "polydipsia", "excessive thirst", "frequent urination", "weight loss", "blurred vision", "fatigue", "lethargy", "dry mouth", "hyperglycemia"],
        "history_risk": ["diabetes", "prediabetes", "hypertension", "obesity", "hyperlipidemia", "metabolic syndrome"],
        "red_flag": False,
        "emergency_alert": None,
        "rationale_template": "Osmotic symptoms (polydipsia, polyuria) coupled with documented metabolic/glycemic risk factors.",
        "recommended_tests": [
            {"test": "Fasting Blood Glucose & Random Glucose", "urgency": "Stat", "reason": "Determine immediate glycemic status"},
            {"test": "Hemoglobin A1c (HbA1c)", "urgency": "Routine", "reason": "Evaluate 3-month glycemic control profile"},
            {"test": "Serum Electrolytes & Anion Gap", "urgency": "Stat", "reason": "Rule out acute metabolic acidosis / ketoacidosis"},
            {"test": "Urine Microalbumin / Creatinine Ratio", "urgency": "Routine", "reason": "Screen for diabetic nephropathy"}
        ]
    },
    {
        "id": "SEPSIS_INFECTION",
        "name": "Systemic Sepsis / Severe Bacteremia",
        "category": "Infectious Disease",
        "keywords": ["high fever", "hypothermia", "rigors", "shivering", "confusion", "altered mental", "hypotension", "tachycardia", "tachypnea", "septic", "severe weakness"],
        "history_risk": ["diabetes", "immunosuppressed", "dialysis", "catheter", "recent surgery"],
        "red_flag": True,
        "emergency_alert": "Critical Alert: qSOFA / Sepsis criteria potentially met. Immediate fluid resuscitation and broad-spectrum workup advised.",
        "rationale_template": "Systemic inflammatory response manifestations with possible end-organ hypoperfusion.",
        "recommended_tests": [
            {"test": "Blood Cultures (x2 sets from distinct venipuncture sites)", "urgency": "Stat before antibiotics", "reason": "Identify bloodstream pathogen"},
            {"test": "Serum Lactic Acid / Lactate", "urgency": "Stat", "reason": "Assess tissue hypoperfusion and anaerobic metabolism"},
            {"test": "Comprehensive Metabolic Panel (CMP) & CBC", "urgency": "Stat", "reason": "Evaluate hepatic/renal dysfunction and bandemia"}
        ]
    },
    {
        "id": "UTI_PYELO",
        "name": "Urinary Tract Infection / Acute Pyelonephritis",
        "category": "Nephrology / Infectious",
        "keywords": ["dysuria", "burning urination", "urinary frequency", "urinary urgency", "suprapubic pain", "foul smelling urine", "flank pain", "costovertebral", "back pain", "fever", "hematuria"],
        "history_risk": ["diabetes", "kidney stones", "uti", "nephrolithiasis", "prostate"],
        "red_flag": False,
        "emergency_alert": None,
        "rationale_template": "Lower and/or upper urinary tract symptoms with irritative voiding and potential ascending renal involvement.",
        "recommended_tests": [
            {"test": "Urinalysis (UA) with Microscopic Examination", "urgency": "Prompt", "reason": "Check for leukocyte esterase, nitrites, WBCs, and bacteria"},
            {"test": "Urine Culture & Sensitivity (Urine C&S)", "urgency": "Prompt", "reason": "Identify specific uropathogen and target antimicrobial therapy"},
            {"test": "Renal Ultrasound", "urgency": "If flank pain or stone suspected", "reason": "Rule out hydronephrosis or structural obstruction"}
        ]
    },
    {
        "id": "ACUTE_GASTRO",
        "name": "Acute Gastroenteritis / Colitis",
        "category": "Gastroenterology",
        "keywords": ["diarrhea", "vomiting", "nausea", "abdominal cramps", "stomach pain", "dehydration", "loose stools", "fever", "watery"],
        "history_risk": ["antibiotic use", "colitis", "crohn", "ibs", "food poisoning"],
        "red_flag": False,
        "emergency_alert": None,
        "rationale_template": "Gastrointestinal illness characterized by acute vomiting, diarrhea, and abdominal cramping.",
        "recommended_tests": [
            {"test": "Serum Electrolytes, BUN, and Creatinine", "urgency": "Prompt", "reason": "Detect dehydration and hypokalemic or pre-renal state"},
            {"test": "Stool Pathogen Panel / Stool Culture", "urgency": "If severe or bloody", "reason": "Screen for bacterial, viral, or parasitic enteropathogens"}
        ]
    },
    {
        "id": "HYPERTENSIVE_URGENCY",
        "name": "Hypertensive Urgency / Crisis",
        "category": "Cardiovascular",
        "keywords": ["high blood pressure", "severe headache", "blurred vision", "epistaxis", "nosebleed", "dizziness", "flushing", "hypertensive"],
        "history_risk": ["hypertension", "essential hypertension", "chronic kidney disease", "ckd"],
        "red_flag": True,
        "emergency_alert": "Evaluate for acute target-organ damage (fundoscopy, ECG, troponin, creatinine).",
        "rationale_template": "Symptomatic elevated blood pressure in a patient with chronic hypertensive vascular disease.",
        "recommended_tests": [
            {"test": "Repeat Serial Blood Pressure Measurement", "urgency": "Immediate in both arms", "reason": "Confirm severity and check arm symmetry"},
            {"test": "Serum Creatinine & Urinalysis", "urgency": "Prompt", "reason": "Assess for acute kidney injury and proteinuria"},
            {"test": "Fundoscopic Examination", "urgency": "Bedside", "reason": "Rule out papilledema or flame hemorrhages"}
        ]
    }
]


@app.post("/doctor-diagnose/")
async def doctor_diagnose(data: DoctorDiagnosisRequest):
    prompt_text = data.prompt.lower()
    conditions_text = [c.lower() for c in data.conditions]
    meds_text = [m.lower() for m in data.medications]
    
    # Extract recent vitals from observations
    vitals_found = {}
    for o in data.observations:
        name = str(o.get('test_name', '')).lower()
        val = o.get('value')
        if 'blood pressure' in name or 'systolic' in name:
            vitals_found['bp'] = val
        elif 'heart rate' in name or 'pulse' in name:
            vitals_found['hr'] = val
        elif 'glucose' in name or 'blood sugar' in name:
            vitals_found['glucose'] = val
        elif 'oxygen' in name or 'spo2' in name:
            vitals_found['spo2'] = val
        elif 'temperature' in name:
            vitals_found['temp'] = val
        elif 'weight' in name or 'bmi' in name:
            vitals_found['bmi'] = val

    differential_matches = []
    red_flags = []
    
    # Evaluate each disease in knowledge base against symptoms and patient history
    for disease in DISEASE_KNOWLEDGE_BASE:
        keyword_hits = [k for k in disease["keywords"] if k in prompt_text]
        history_hits = [h for h in disease["history_risk"] if any(h in c for c in conditions_text)]
        med_hits = [h for h in disease["history_risk"] if any(h in m for m in meds_text)]
        
        total_score = len(keyword_hits) * 2.5 + len(history_hits) * 2.0 + len(med_hits) * 1.5
        
        # Check vital correlations
        vital_correlations = []
        if disease["id"] == "ACS_MI" or disease["id"] == "HYPERTENSIVE_URGENCY":
            if vitals_found.get('bp'):
                vital_correlations.append(f"Documented BP: {vitals_found['bp']}")
        if disease["id"] == "T2D_HYPERGLYCEMIA":
            if vitals_found.get('glucose'):
                vital_correlations.append(f"Documented Glucose: {vitals_found['glucose']} mg/dL")
        if disease["id"] == "COPD_ASTHMA_EXAC" or disease["id"] == "PNEUMONIA":
            if vitals_found.get('spo2'):
                vital_correlations.append(f"Recorded SpO2: {vitals_found['spo2']}%")

        if keyword_hits or (history_hits and any(w in prompt_text for w in ["pain", "fever", "cough", "breath", "dizzy", "weak"])):
            if total_score >= 5.0 or len(keyword_hits) >= 2:
                probability = "High Likelihood"
                badge_color = "red"
            elif total_score >= 2.5 or len(keyword_hits) == 1:
                probability = "Moderate Likelihood"
                badge_color = "amber"
            else:
                probability = "Consideration"
                badge_color = "blue"
                
            differential_matches.append({
                "id": disease["id"],
                "name": disease["name"],
                "category": disease["category"],
                "probability": probability,
                "badge_color": badge_color,
                "score": total_score,
                "matched_symptoms": keyword_hits,
                "matched_history": list(set(history_hits + med_hits)),
                "vital_correlations": vital_correlations,
                "rationale": f"{disease['rationale_template']} " + (f"Patient history of {', '.join(history_hits)} substantially increases prior probability." if history_hits else "Consistent with acute clinical presentation."),
                "recommended_tests": disease["recommended_tests"]
            })
            
            if disease["red_flag"] and len(keyword_hits) >= 1:
                red_flags.append({
                    "condition": disease["name"],
                    "alert": disease["emergency_alert"] or "Clinical signs warrant prioritized immediate investigation.",
                    "severity": "CRITICAL" if disease["id"] in ["ACS_MI", "SEPSIS_INFECTION", "PULM_EMBOLISM"] else "HIGH"
                })

    # Sort differentials by highest score
    differential_matches.sort(key=lambda x: x["score"], reverse=True)
    
    # Fallback if vague prompt
    if not differential_matches:
        differential_matches.append({
            "id": "UNSPECIFIED_EVAL",
            "name": "General Clinical Evaluation / Undifferentiated Symptoms",
            "category": "General Medicine",
            "probability": "Consideration",
            "badge_color": "blue",
            "score": 1.0,
            "matched_symptoms": ["General consultation inquiry"],
            "matched_history": [c for c in conditions_text[:3]],
            "vital_correlations": [],
            "rationale": "Symptoms provided did not distinctly trigger specific high-risk diagnostic rules. Baseline diagnostic panel recommended.",
            "recommended_tests": [
                {"test": "Comprehensive Metabolic Panel (CMP)", "urgency": "Routine", "reason": "General baseline organ status"},
                {"test": "Complete Blood Count (CBC) with differential", "urgency": "Routine", "reason": "Rule out subclinical inflammatory process"}
            ]
        })

    # Aggregate recommended tests across top diagnoses without duplicates
    seen_tests = set()
    aggregated_tests = []
    for diag in differential_matches[:4]:
        for test_item in diag["recommended_tests"]:
            if test_item["test"] not in seen_tests:
                seen_tests.add(test_item["test"])
                aggregated_tests.append(test_item)

    return {
        "status": "success",
        "patient_summary": {
            "name": data.patient_name,
            "age": data.patient_age,
            "gender": data.gender,
            "known_conditions_count": len(data.conditions),
            "active_medications_count": len(data.medications),
            "vitals_summary": vitals_found
        },
        "query_prompt": data.prompt,
        "differential_diagnoses": differential_matches[:6],
        "red_flags": red_flags,
        "recommended_orders": aggregated_tests[:8],
        "clinical_disclaimer": "AI Clinical Decision Support is an assistive tool intended for licensed physicians. It does not replace professional medical judgment, physical examination, or diagnostic verification."
    }

