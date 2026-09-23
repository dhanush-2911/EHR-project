import csv
import uuid
import random
from datetime import datetime, timedelta

def random_date(start, end):
    return start + timedelta(
        seconds=random.randint(0, int((end - start).total_seconds())),
    )

patients = []
for i in range(5):
    pid = str(uuid.uuid4())
    patients.append({
        'Id': pid,
        'BIRTHDATE': '19' + str(random.randint(40, 99)) + '-0' + str(random.randint(1, 9)) + '-15',
        'DEATHDATE': '',
        'SSN': 'xxx-xx-xxxx',
        'DRIVERS': 'xxxx',
        'PASSPORT': 'xxxx',
        'PREFIX': 'Mr.',
        'FIRST': random.choice(['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth']),
        'LAST': random.choice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']),
        'SUFFIX': '',
        'MAIDEN': '',
        'MARITAL': 'M',
        'RACE': 'white',
        'ETHNICITY': 'nonhispanic',
        'GENDER': random.choice(['M', 'F']),
        'BIRTHPLACE': 'Boston, MA',
        'ADDRESS': '123 Fake St',
        'CITY': 'Boston',
        'STATE': 'MA',
        'COUNTY': 'Suffolk',
        'ZIP': '02108',
        'LAT': '42.3',
        'LON': '-71.1',
        'HEALTHCARE_EXPENSES': '1000',
        'HEALTHCARE_COVERAGE': '500'
    })

encounters = []
conditions = []
observations = []

providers = ['prov1', 'prov2']
organizations = ['org1']

for p in patients:
    # 2 encounters per patient
    for _ in range(2):
        eid = str(uuid.uuid4())
        date = random_date(datetime(2020, 1, 1), datetime(2025, 1, 1))
        encounters.append({
            'Id': eid,
            'START': date.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'STOP': (date + timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'PATIENT': p['Id'],
            'ORGANIZATION': organizations[0],
            'PROVIDER': random.choice(providers),
            'PAYER': '',
            'ENCOUNTERCLASS': 'ambulatory',
            'CODE': '185349003',
            'DESCRIPTION': 'Encounter for check up',
            'BASE_ENCOUNTER_COST': '100',
            'TOTAL_CLAIM_COST': '100',
            'PAYER_COVERAGE': '100',
            'REASONCODE': '',
            'REASONDESCRIPTION': ''
        })
        
        # 1 condition per encounter
        conditions.append({
            'START': date.strftime('%Y-%m-%d'),
            'STOP': '',
            'PATIENT': p['Id'],
            'ENCOUNTER': eid,
            'CODE': '44054006',
            'DESCRIPTION': random.choice(['Hypertension', 'Diabetes', 'Asthma', 'Hyperlipidemia']),
        })
        
        # 2 observations per encounter
        observations.append({
            'DATE': date.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'PATIENT': p['Id'],
            'ENCOUNTER': eid,
            'CODE': '8302-2',
            'DESCRIPTION': 'Body Height',
            'VALUE': str(random.randint(150, 190)),
            'UNITS': 'cm',
            'TYPE': 'numeric'
        })
        observations.append({
            'DATE': date.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'PATIENT': p['Id'],
            'ENCOUNTER': eid,
            'CODE': '29463-7',
            'DESCRIPTION': 'Body Weight',
            'VALUE': str(random.randint(60, 100)),
            'UNITS': 'kg',
            'TYPE': 'numeric'
        })

import os
data_dir = r'C:\Users\Admin\Downloads\EHR project\backend\data\synthea\csv'

def append_csv(filename, data):
    path = os.path.join(data_dir, filename)
    file_exists = os.path.isfile(path)
    if not data: return
    with open(path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        if not file_exists:
            writer.writeheader()
        writer.writerows(data)

append_csv('patients.csv', patients)
append_csv('encounters.csv', encounters)
append_csv('conditions.csv', conditions)
append_csv('observations.csv', observations)
