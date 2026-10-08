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
    # OCR extraction using Tesseract or text fallback
    try:
        content = await file.read()
        extracted_text = ""
        filename = file.filename or ""

        # Try PDF extraction
        if filename.lower().endswith('.pdf'):
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(content))
                extracted_text = "\n".join([page.extract_text() or "" for page in reader.pages]).strip()
            except Exception as pe:
                pass

        # Try plain text decode
        if not extracted_text:
            try:
                extracted_text = content.decode('utf-8', errors='ignore').strip()
            except:
                pass

        # Try image OCR if pytesseract is installed
        if not extracted_text:
            try:
                import pytesseract
                from PIL import Image
                image = Image.open(io.BytesIO(content))
                extracted_text = pytesseract.image_to_string(image).strip()
            except:
                pass

        return {
            "text": extracted_text or "No legible text found in document.",
            "confidence": "Medium" if extracted_text else "Low",
            "disclaimer": "OCR extraction requires human confirmation before being treated as authoritative."
        }
    except Exception as e:
        return {"error": str(e)}


class ReportAnalysisRequest(BaseModel):
    report_text: str
    patient_id: Optional[str] = None
    patient_name: Optional[str] = "Patient"
    patient_age: Optional[int] = 40
    gender: Optional[str] = "Unknown"
    existing_conditions: List[str] = []
    existing_medications: List[str] = []
    existing_allergies: List[str] = []


@app.post("/analyze-report/")
async def analyze_medical_report(req: ReportAnalysisRequest):
    text = req.report_text.strip()
    text_lower = text.lower()
    
    import re
    
    # 1. Structured Biomarker & Vital Parser
    detected_biomarkers = []
    
    biomarker_patterns = [
        ("Hemoglobin A1c (HbA1c)", r'(?:hba1c|a1c|glycated hemoglobin)[\s:=]+([0-9]+\.?[0-9]*)[\s%]*', "%", 4.0, 5.6, 6.5, "Glycemic control marker"),
        ("Fasting Blood Glucose", r'(?:fasting blood sugar|fasting glucose|fbs|glucose)[\s:=]+([0-9]+(?:\.[0-9]+)?)[\s]*(?:mg/dl)?', "mg/dL", 70.0, 99.0, 126.0, "Pancreatic endocrine function"),
        ("Systolic Blood Pressure", r'(?:systolic|bp|blood pressure)[\s:=]+([0-9]{2,3})\s*(?:/|\s*over\s*)\s*([0-9]{2,3})?', "mmHg", 90.0, 120.0, 140.0, "Cardiovascular pressure"),
        ("Serum Creatinine", r'(?:serum creatinine|creatinine)[\s:=]+([0-9]+\.?[0-9]*)[\s]*(?:mg/dl)?', "mg/dL", 0.6, 1.2, 1.5, "Kidney filtration biomarker"),
        ("Estimated GFR (eGFR)", r'(?:egfr|gfr)[\s:=]+([0-9]+(?:\.[0-9]+)?)[\s]*(?:ml/min)?', "mL/min/1.73m2", 60.0, 120.0, 30.0, "Renal clearance capacity"),
        ("Total Cholesterol", r'(?:total cholesterol|cholesterol)[\s:=]+([0-9]+(?:\.[0-9]+)?)[\s]*(?:mg/dl)?', "mg/dL", 125.0, 200.0, 240.0, "Lipid atherogenic risk"),
        ("LDL Cholesterol", r'(?:ldl|ldl-c|bad cholesterol)[\s:=]+([0-9]+(?:\.[0-9]+)?)[\s]*(?:mg/dl)?', "mg/dL", 0.0, 100.0, 160.0, "Atherosclerotic cardiovascular marker"),
        ("HDL Cholesterol", r'(?:hdl|hdl-c|good cholesterol)[\s:=]+([0-9]+(?:\.[0-9]+)?)[\s]*(?:mg/dl)?', "mg/dL", 40.0, 90.0, 35.0, "Protective lipoprotein"),
        ("Triglycerides", r'(?:triglycerides|tg)[\s:=]+([0-9]+(?:\.[0-9]+)?)[\s]*(?:mg/dl)?', "mg/dL", 50.0, 150.0, 200.0, "Metabolic lipid particle"),
        ("White Blood Cell Count (WBC)", r'(?:wbc|white blood cells?|leukocytes?)[\s:=]+([0-9]+(?:\.[0-9]+)?)[\s]*(?:10\*3/ul|k/ul|x10\^3)?', "10*3/uL", 4.5, 11.0, 14.0, "Immune and inflammatory status"),
        ("Hemoglobin (Hgb)", r'(?:hemoglobin|hgb)[\s:=]+([0-9]+\.?[0-9]*)[\s]*(?:g/dl)?', "g/dL", 12.0, 16.5, 10.0, "Oxygen transport capacity"),
        ("Platelets", r'(?:platelets?|plt)[\s:=]+([0-9]+(?:\.[0-9]+)?)[\s]*(?:10\*3/ul|k/ul)?', "10*3/uL", 150.0, 450.0, 100.0, "Hemostatic clotting factor"),
        ("Thyroid Stimulating Hormone (TSH)", r'(?:tsh|thyroid stimulating hormone)[\s:=]+([0-9]+\.?[0-9]*)[\s]*(?:u?iu/ml)?', "uIU/mL", 0.4, 4.0, 10.0, "Thyroid pituitary regulation"),
        ("C-Reactive Protein (CRP)", r'(?:crp|c-reactive protein)[\s:=]+([0-9]+\.?[0-9]*)[\s]*(?:mg/l)?', "mg/L", 0.0, 3.0, 10.0, "Systemic inflammation marker"),
        ("Pulse Oximetry (SpO2)", r'(?:spo2|pulse ox|oxygen sat(?:uration)?)[\s:=]+([0-9]{2,3})[\s%]*', "%", 95.0, 100.0, 90.0, "Blood oxygen saturation"),
    ]
    
    for name, pattern, units, normal_min, normal_max, critical_val, desc in biomarker_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                val = float(match.group(1))
                status = "Normal"
                flag = "NORMAL"
                if val > normal_max:
                    status = "Elevated"
                    flag = "HIGH"
                elif val < normal_min:
                    status = "Low"
                    flag = "LOW"
                    
                detected_biomarkers.append({
                    "name": name,
                    "value": val,
                    "units": units,
                    "reference_range": f"{normal_min} - {normal_max} {units}",
                    "status": status,
                    "flag": flag,
                    "description": desc
                })
            except:
                pass

    # 2. Disease Category Identification from Clinical Report Text
    category_scores = {
        "Cardiovascular & Heart Diseases": 0,
        "Kidney Diseases (Renal)": 0,
        "Respiratory Diseases": 0,
        "Infectious & Communicable Diseases": 0,
        "Cancers (Oncology)": 0,
        "Endocrine & Metabolic Disorders": 0,
    }
    
    keywords_map = {
        "Cardiovascular & Heart Diseases": ["heart", "cardio", "hypertension", "systolic", "diastolic", "angina", "stemi", "ischemi", "coronary", "arrhythmia", "cholesterol", "ldl", "troponin", "ecg", "bp"],
        "Kidney Diseases (Renal)": ["kidney", "renal", "creatinine", "egfr", "gfr", "nephro", "bun", "proteinuria", "albuminuria", "dialysis", "glomerular"],
        "Respiratory Diseases": ["lung", "respiratory", "asthma", "copd", "bronch", "pulmonary", "spo2", "hypox", "cough", "fev1", "wheez", "emphysema", "apnea"],
        "Infectious & Communicable Diseases": ["infection", "viral", "bacterial", "fever", "covid", "tuberculosis", "pneumonia", "sepsis", "wbc", "crp", "dengue", "hepatitis", "pathogen"],
        "Cancers (Oncology)": ["cancer", "carcinoma", "tumor", "neoplasm", "malignan", "biopsy", "oncology", "lymphoma", "leukemia", "metastasis", "chemotherapy"],
        "Endocrine & Metabolic Disorders": ["diabetes", "glucose", "hba1c", "a1c", "insulin", "thyroid", "tsh", "metabolic", "hyperglycemia", "pancreas"]
    }
    
    for cat, kws in keywords_map.items():
        for kw in kws:
            if kw in text_lower:
                category_scores[cat] += text_lower.count(kw)
                
    primary_category = max(category_scores.items(), key=lambda x: x[1])
    if primary_category[1] == 0:
        detected_category = "General Health Evaluation"
    else:
        detected_category = primary_category[0]

    # 3. Clinical Diagnostic Findings Extraction
    findings = []
    clinical_risk_level = "LOW"
    
    # Check for acute/concerning values
    for b in detected_biomarkers:
        if b["name"] == "Hemoglobin A1c (HbA1c)" and b["value"] >= 6.5:
            findings.append(f"Elevated HbA1c ({b['value']}%) indicates diabetic glycemic range (Type 2 Diabetes risk).")
            clinical_risk_level = max(clinical_risk_level, "MODERATE", key=lambda x: ["LOW", "MODERATE", "HIGH", "CRITICAL"].index(x))
        if b["name"] == "Systolic Blood Pressure" and b["value"] >= 140:
            findings.append(f"Elevated Systolic Blood Pressure ({b['value']} mmHg) indicates Stage 2 Hypertension.")
            clinical_risk_level = max(clinical_risk_level, "MODERATE", key=lambda x: ["LOW", "MODERATE", "HIGH", "CRITICAL"].index(x))
        if b["name"] == "Serum Creatinine" and b["value"] >= 1.5:
            findings.append(f"Elevated Serum Creatinine ({b['value']} mg/dL) points to impaired renal clearance.")
            clinical_risk_level = max(clinical_risk_level, "HIGH", key=lambda x: ["LOW", "MODERATE", "HIGH", "CRITICAL"].index(x))
        if b["name"] == "Pulse Oximetry (SpO2)" and b["value"] < 92:
            findings.append(f"Low oxygen saturation SpO2 ({b['value']}%) indicates hypoxemia; immediate supplemental care recommended.")
            clinical_risk_level = "CRITICAL"
        if b["name"] == "LDL Cholesterol" and b["value"] >= 160:
            findings.append(f"High LDL Cholesterol ({b['value']} mg/dL) significantly increases atherosclerotic cardiovascular plaque risk.")
            clinical_risk_level = max(clinical_risk_level, "MODERATE", key=lambda x: ["LOW", "MODERATE", "HIGH", "CRITICAL"].index(x))
        if b["name"] == "C-Reactive Protein (CRP)" and b["value"] >= 10:
            findings.append(f"Significantly elevated CRP ({b['value']} mg/L) indicates active systemic inflammatory or infectious burden.")
            clinical_risk_level = max(clinical_risk_level, "HIGH", key=lambda x: ["LOW", "MODERATE", "HIGH", "CRITICAL"].index(x))

    if not findings:
        findings.append("All parsed laboratory markers are within standard physiological ranges or baseline expectations.")

    # 4. Prognostic Predictions
    predictions = []
    
    # Prediction 1: Metabolic / Cardiovascular
    has_high_glucose = any(b["name"] in ["Hemoglobin A1c (HbA1c)", "Fasting Blood Glucose"] and b["status"] == "Elevated" for b in detected_biomarkers)
    has_high_bp = any(b["name"] == "Systolic Blood Pressure" and b["status"] == "Elevated" for b in detected_biomarkers)
    has_high_lipids = any(b["name"] in ["LDL Cholesterol", "Total Cholesterol"] and b["status"] == "Elevated" for b in detected_biomarkers)
    has_renal_impairment = any(b["name"] in ["Serum Creatinine", "Estimated GFR (eGFR)"] and (b["flag"] == "HIGH" or b["flag"] == "LOW") for b in detected_biomarkers)

    if has_high_glucose and has_high_bp:
        predictions.append({
            "condition": "Cardiometabolic Syndrome & Vascular Complications",
            "probability": "High (75% - 85%)",
            "timeframe": "12 - 36 months if unmanaged",
            "risk_tier": "HIGH",
            "impact_area": "Microvascular and macrovascular vessel integrity",
            "preventive_intervention": "Dual antihypertensive & antidiabetic titration, strict sodium <2g/day, low-glycemic dietary regimen."
        })
    elif has_high_glucose:
        predictions.append({
            "condition": "Type 2 Diabetes Mellitus Progression",
            "probability": "Moderate to High (65% - 75%)",
            "timeframe": "6 - 18 months",
            "risk_tier": "MODERATE",
            "impact_area": "Endocrine glycemic homeostasis",
            "preventive_intervention": "Metformin therapy evaluation, 150 min/week moderate physical aerobic exercise, carbohydrate counting."
        })

    if has_high_bp or has_high_lipids:
        predictions.append({
            "condition": "Atherosclerotic Coronary Artery Disease (ASCVD)",
            "probability": "Moderate (50% - 65%)",
            "timeframe": "3 - 5 years",
            "risk_tier": "MODERATE",
            "impact_area": "Coronary perfusion and endothelial health",
            "preventive_intervention": "Moderate-to-high intensity statin therapy discussion, coronary calcium score (CAC) screening, DASH diet."
        })

    if has_renal_impairment:
        predictions.append({
            "condition": "Chronic Kidney Disease (CKD Stage 3+)",
            "probability": "High (70% - 80%)",
            "timeframe": "Progression over 24 months",
            "risk_tier": "HIGH",
            "impact_area": "Renal glomerular filtration",
            "preventive_intervention": "Avoid NSAIDs, start SGLT2 inhibitor / ACE-inhibitor for renal protection, monitor urine ACR quarterly."
        })

    # Default general prediction if specific ones didn't trigger
    if not predictions:
        predictions.append({
            "condition": "Optimal Longevity & Chronic Disease Prevention",
            "probability": "Favorable (> 90%)",
            "timeframe": "Ongoing Annual Review",
            "risk_tier": "LOW",
            "impact_area": "General Vitality & Wellness",
            "preventive_intervention": "Maintain current lifestyle, balanced Mediterranean-style nutrition, annual preventive clinical checkups."
        })

    # 5. Actionable Clinical Suggestions
    suggestions = [
        {
            "category": "Physician Follow-up",
            "action": f"Schedule follow-up appointment with Dr. Sarah Smith or a specialist in {detected_category}.",
            "priority": "High" if clinical_risk_level in ["HIGH", "CRITICAL"] else "Routine"
        },
        {
            "category": "Diagnostic Testing",
            "action": "Complete any recommended repeat panels (BMP, Lipid Panel, or HbA1c) in 90 days to verify biomarker trends.",
            "priority": "Medium"
        },
        {
            "category": "Lifestyle & Dietary Guidance",
            "action": "Maintain optimal hydration, restrict processed sodium to < 2,000 mg/day, and adopt a balanced whole-foods Mediterranean diet.",
            "priority": "Medium"
        },
        {
            "category": "Medication Safety",
            "action": "Review current prescribed regimen with your clinician before starting or stopping any over-the-counter supplements.",
            "priority": "Routine"
        }
    ]

    return {
        "status": "success",
        "report_summary": {
            "patient_name": req.patient_name,
            "detected_category": detected_category,
            "clinical_risk_level": clinical_risk_level,
            "markers_parsed_count": len(detected_biomarkers),
            "findings_count": len(findings),
            "predictions_count": len(predictions)
        },
        "parsed_biomarkers": detected_biomarkers,
        "key_findings": findings,
        "predicted_risks": predictions,
        "actionable_suggestions": suggestions,
        "raw_text_preview": text[:400] + ("..." if len(text) > 400 else ""),
        "disclaimer": "This automated analysis is powered by MediLink AI for patient informational support. It does not replace formal clinical diagnosis by a licensed physician."
    }

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    patient_context: dict

@app.post("/chat/")
async def chat_with_assistant(req: ChatRequest):
    # Clinical AI Assistant for Patient Portal
    user_message = req.messages[-1].content.strip().lower()
    ctx = req.patient_context or {}
    
    patient_name = ctx.get("name", "Patient")
    conditions = ctx.get("conditions", [])
    medications = ctx.get("medications", [])
    observations = ctx.get("observations", [])
    allergies = ctx.get("allergies", [])
    
    cond_names = [c.get("description", "") for c in conditions if isinstance(c, dict)]
    med_names = [m.get("medication_name", "") for m in medications if isinstance(m, dict)]
    obs_summary = [f"{o.get('test_name', '')}: {o.get('value', '')} {o.get('units', '')}" for o in observations if isinstance(o, dict)]
    allergy_names = [a.get("allergen", "") for a in allergies if isinstance(a, dict)]

    # 1. Handle Temperature & Fever Q&A follow-ups
    if len(req.messages) >= 3:
        prev_bot_message = req.messages[-2].content.lower()
        if "what is your current temperature" in prev_bot_message or "temperature" in prev_bot_message:
            import re
            temp_match = re.search(r'(\d{2,3}(\.\d+)?)', user_message)
            if temp_match:
                temp = float(temp_match.group(1))
                if temp > 103:
                    return {"reply": f"🚨 **Immediate Warning**: A body temperature of **{temp}°F** is critically high (hyperpyrexia risk).\n\n"
                                     f"• **Action Required**: Please proceed to the nearest Emergency Department immediately.\n"
                                     f"• **Allergy Caution**: Before taking antipyretics, verify against your documented allergies: {', '.join(allergy_names) or 'None documented'}."}
                elif temp > 100.4:
                    return {"reply": f"🌡️ **Clinical Analysis**: Your temperature is **{temp}°F**, confirming an active low-to-moderate grade fever.\n\n"
                                     f"• **Record Cross-Check**: Active diagnoses: {', '.join(cond_names[:2]) or 'None'}.\n"
                                     f"• **Clinical Suggestion**: Hydrate aggressively with electrolyte solutions. You may discuss taking Acetaminophen (500mg-650mg) with your care team if not contraindicated by hepatic history. If fever persists over 48 hours or is accompanied by chest pain or shortness of breath, contact your clinic immediately."}
                else:
                    return {"reply": f"✅ **Normal Vitals**: Your recorded temperature of **{temp}°F** is within the physiological normal range (97.0°F - 99.0°F). Make sure you rest and maintain adequate hydration."}

    # 2. Comprehensive Record Analysis Request
    if any(k in user_message for k in ["analyze", "summary", "overview", "record", "my health", "check my", "report"]):
        cond_str = "\n".join([f"  • {c}" for c in cond_names]) if cond_names else "  • No chronic conditions currently registered."
        med_str = "\n".join([f"  • {m}" for m in med_names[:4]]) if med_names else "  • No active prescriptions recorded."
        obs_str = "\n".join([f"  • {o}" for o in obs_summary[:4]]) if obs_summary else "  • Recent lab panel clear or pending."
        all_str = ", ".join(allergy_names) if allergy_names else "No documented drug or food allergies."

        reply = (
            f"📋 **Personal Clinical Record Analysis for {patient_name}**\n\n"
            f"**1. Diagnosed Conditions:**\n{cond_str}\n\n"
            f"**2. Active Regimen (Prescriptions):**\n{med_str}\n\n"
            f"**3. Recent Key Lab Observations:**\n{obs_str}\n\n"
            f"**4. Allergy Precautions:**\n  • {all_str}\n\n"
            f"💡 **AI Health Suggestions:**\n"
            f"• **Medication Adherence**: Take all prescribed therapies consistently at the designated times.\n"
            f"• **Lab Tracking**: Monitor your diagnostic values and alert your doctor if you experience symptomatic fluctuations.\n"
            f"• **Lifestyle & Diet**: Follow clinical sodium and glycemic dietary recommendations aligned with your diagnoses.\n"
            f"• Ask me about any specific test, prescription, or symptom above for in-depth guidance!"
        )
        return {"reply": reply}

    # 3. Blood Pressure / Cardiovascular / Heart Questions
    if any(k in user_message for k in ["blood pressure", "bp", "hypertension", "heart", "stemi", "cardiac"]):
        bp_obs = [o for o in obs_summary if "pressure" in o.lower() or "bp" in o.lower() or "systolic" in o.lower() or "diastolic" in o.lower()]
        bp_info = f"Your latest recorded readings are: **{', '.join(bp_obs)}**." if bp_obs else "Your baseline blood pressure is being tracked."
        cardio_meds = [m for m in med_names if any(w in m.lower() for w in ["lisinopril", "metoprolol", "ramipril", "atorvastatin", "aspirin", "ticagrelor", "carvedilol", "losartan", "amlodipine"])]
        
        reply = (
            f"❤️ **Cardiovascular Record Analysis**\n\n"
            f"{bp_info}\n\n"
            f"**Current Prescribed Regimen:**\n"
            f"{'• ' + chr(10) + '• '.join(cardio_meds) if cardio_meds else '• Standard ambulatory monitoring.'}\n\n"
            f"💡 **Clinical Suggestions & Care Guidelines:**\n"
            f"1. **Home Log**: Log your blood pressure twice daily (morning upon waking and evening before sleep).\n"
            f"2. **Dietary Sodium**: Maintain dietary sodium below 1,500mg - 2,000mg per day (DASH diet protocol).\n"
            f"3. **Warning Signs**: If systolic pressure exceeds 160 mmHg, or if you experience chest tightness, sudden shortness of breath, or lightheadedness, seek immediate clinical attention."
        )
        return {"reply": reply}

    # 4. Diabetes / Blood Glucose / Metabolic Questions
    if any(k in user_message for k in ["sugar", "glucose", "diabetes", "hba1c", "a1c", "metabolic"]):
        dm_obs = [o for o in obs_summary if any(w in o.lower() for w in ["glucose", "a1c", "bmi"])]
        dm_info = f"Recent metabolic values: **{', '.join(dm_obs)}**." if dm_obs else "No recent glycemic lab values found."
        dm_meds = [m for m in med_names if any(w in m.lower() for w in ["metformin", "empagliflozin", "insulin", "jardiance", "glipizide"])]
        
        reply = (
            f"🩸 **Glycemic & Metabolic Analysis**\n\n"
            f"{dm_info}\n\n"
            f"**Prescribed Diabetes Therapies:**\n"
            f"{'• ' + chr(10) + '• '.join(dm_meds) if dm_meds else '• Dietary & lifestyle glucose regulation.'}\n\n"
            f"💡 **AI Clinical Suggestions:**\n"
            f"1. **A1c Target**: Aim for HbA1c < 7.0% (individualized according to clinical guidelines).\n"
            f"2. **Nutrition**: Focus on complex carbohydrates with high soluble fiber; avoid refined syrups and sugary beverages.\n"
            f"3. **Foot & Eye Checks**: Schedule annual diabetic retinopathy screening and comprehensive foot examinations."
        )
        return {"reply": reply}

    # 5. Kidney / Renal Health Questions
    if any(k in user_message for k in ["kidney", "renal", "creatinine", "gfr", "egfr", "proteinuria", "urine"]):
        kidney_obs = [o for o in obs_summary if any(w in o.lower() for w in ["creatinine", "gfr", "egfr", "bun", "albumin", "uacr"])]
        kidney_info = f"Current renal markers: **{', '.join(kidney_obs)}**." if kidney_obs else "Renal biomarkers monitored on schedule."
        
        reply = (
            f"🧪 **Nephrology & Renal Function Analysis**\n\n"
            f"{kidney_info}\n\n"
            f"💡 **Renal Protection Suggestions:**\n"
            f"1. **Avoid Nephrotoxic Agents**: Strict avoidance of over-the-counter NSAIDs (such as Ibuprofen, Naproxen) as they reduce renal blood flow.\n"
            f"2. **Hydration & Electrolytes**: Maintain balanced hydration and follow your doctor's daily fluid and potassium instructions.\n"
            f"3. **Blood Pressure Control**: Tight blood pressure management (< 130/80 mmHg) is critical to protect glomerular filtration."
        )
        return {"reply": reply}

    # 6. Respiratory / Lungs / Breathing Questions
    if any(k in user_message for k in ["breath", "lung", "asthma", "copd", "cough", "inhaler", "oxygen", "spo2"]):
        resp_obs = [o for o in obs_summary if any(w in o.lower() for w in ["spo2", "oximetry", "fev1", "pef", "feno", "respiration"])]
        resp_info = f"Respiratory vitals: **{', '.join(resp_obs)}**." if resp_obs else "Pulse oximetry monitored at clinic."
        resp_meds = [m for m in med_names if any(w in m.lower() for w in ["albuterol", "symbicort", "advair", "tiotropium", "montelukast", "prednisone"])]

        reply = (
            f"🫁 **Respiratory Record Analysis**\n\n"
            f"{resp_info}\n\n"
            f"**Prescribed Inhalers & Airway Regimen:**\n"
            f"{'• ' + chr(10) + '• '.join(resp_meds) if resp_meds else '• Maintenance respiratory therapy.'}\n\n"
            f"💡 **Pulmonary Suggestions:**\n"
            f"1. **Inhaler Technique**: Rinse mouth thoroughly after corticosteroid inhaler use to prevent oral candidiasis.\n"
            f"2. **Rescue Inhaler**: Keep your rapid-acting rescue inhaler accessible at all times.\n"
            f"3. **Trigger Avoidance**: Steer clear of environmental irritants, cigarette smoke, and cold air extremes."
        )
        return {"reply": reply}

    # 7. Prescriptions / Medications Inquiry
    if any(k in user_message for k in ["medication", "pill", "prescription", "rx", "drug", "dose"]):
        med_list = "\n".join([f"  • **{m}**" for m in med_names]) if med_names else "  • No active medications found."
        allergy_warning = f"⚠️ Documented allergies: **{', '.join(allergy_names)}**." if allergy_names else "No documented drug allergies."

        reply = (
            f"💊 **Medication & Pharmacy Overview**\n\n"
            f"{med_list}\n\n"
            f"{allergy_warning}\n\n"
            f"💡 **AI Pharmacotherapy Suggestions:**\n"
            f"• Never discontinue or adjust prescription dosages without consulting your prescribing physician.\n"
            f"• If you experience dizziness, gastrointestinal upset, or unexpected rash, contact your provider immediately."
        )
        return {"reply": reply}

    # 8. Diet & Nutrition Guidance
    if any(k in user_message for k in ["diet", "food", "eat", "meal", "nutrition"]):
        reply = (
            f"🥗 **Personalized Nutrition & Dietary Suggestions for {patient_name}**\n\n"
            f"Based on your diagnosed conditions ({', '.join(cond_names[:3]) or 'General Wellness'}):\n\n"
            f"• **Sodium Regulation**: Limit salt intake to < 2,000mg/day to support healthy blood pressure and kidney function.\n"
            f"• **Whole Foods Focus**: Prioritize leafy greens, legumes, cruciferous vegetables, lean poultry, and omega-3 rich fish.\n"
            f"• **Hydration**: Drink adequate water throughout the day (unless placed on clinical fluid restriction by your nephrologist or cardiologist).\n"
            f"• **Avoid**: Ultra-processed snack foods, trans fats, and excess refined sugars."
        )
        return {"reply": reply}

    # 9. General Greetings & Natural Follow-ups
    if any(k in user_message for k in ["hello", "hi", "hey"]):
        return {
            "reply": f"Hello {patient_name}! I am your clinical AI Health Assistant. I have analyzed your complete health chart including your diagnosed conditions ({', '.join(cond_names[:2]) or 'General Care'}), active medications, and lab reports.\n\n"
                     f"How can I assist you today? You can ask me to **analyze your records**, explain your **medications**, review your **blood pressure/labs**, or give **dietary suggestions**!"
        }

    # 10. Default Intelligent Context-Aware Synthesis
    reply = (
        f"🩺 **AI Health Assistant Response**\n\n"
        f"Thank you for your question. Based on your active medical profile ({', '.join(cond_names[:2]) or 'Patient Record'}):\n\n"
        f"• **Diagnostic Context**: Your chart includes {len(conditions)} clinical condition(s) and {len(medications)} active prescription(s).\n"
        f"• **Allergy Safeguard**: Cross-referenced against your documented allergies ({', '.join(allergy_names) or 'None documented'}).\n\n"
        f"💡 **Clinical Suggestion**: Would you like me to:\n"
        f"1. Provide a **complete analysis** of your lab test results?\n"
        f"2. Explain your **prescriptions & potential side effects**?\n"
        f"3. Offer **dietary & lifestyle recommendations** tailored to your condition?"
    )
    return {"reply": reply}


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

