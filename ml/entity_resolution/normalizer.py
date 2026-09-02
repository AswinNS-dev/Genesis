import re
import unicodedata

def normalize_whitespace(text: str) -> str:
    if not text:
        return ""
    return re.sub(r'\s+', ' ', str(text)).strip()

def remove_accents(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text)\
           .encode('ascii', 'ignore')\
           .decode("utf-8")
    return str(text)

def normalize_name(name: str) -> str:
    if pd.isna(name) or not name: return ""
    name = remove_accents(name).lower()
    name = re.sub(r'[^\w\s]', '', name)
    # Remove common titles
    titles = r'\b(mr|mrs|ms|dr|prof|sir|smt|shri)\b'
    name = re.sub(titles, '', name)
    return normalize_whitespace(name)

def normalize_phone(phone: str) -> str:
    if pd.isna(phone) or not phone: return ""
    # Keep only digits and plus sign
    phone = re.sub(r'[^\d+]', '', str(phone))
    if phone.startswith('0'):
        phone = phone[1:]
    if phone.startswith('+91') and len(phone) > 3:
        phone = phone[3:]
    elif phone.startswith('91') and len(phone) == 12:
        phone = phone[2:]
    return phone

def normalize_vehicle(plate: str) -> str:
    if pd.isna(plate) or not plate: return ""
    plate = str(plate).upper()
    plate = re.sub(r'[^A-Z0-9]', '', plate)
    return plate

def normalize_location(loc: str) -> str:
    if pd.isna(loc) or not loc: return ""
    loc = remove_accents(loc).lower()
    loc = re.sub(r'[^\w\s]', '', loc)
    return normalize_whitespace(loc)

import pandas as pd # Need this for pd.isna
