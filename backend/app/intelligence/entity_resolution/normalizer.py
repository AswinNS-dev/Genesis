import re
import unicodedata
from typing import Any

def normalize_whitespace(text: Any) -> str:
    if not text:
        return ""
    return re.sub(r'\s+', ' ', str(text)).strip()

def remove_accents(text: Any) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', str(text))\
           .encode('ascii', 'ignore')\
           .decode("utf-8")
    return str(text)

def normalize_name(name: Any) -> str:
    if not name or str(name).lower() == 'nan':
        return ""
    name = remove_accents(name).lower()
    name = re.sub(r'[^\w\s]', '', name)
    titles = r'\b(mr|mrs|ms|dr|prof|sir|smt|shri)\b'
    name = re.sub(titles, '', name)
    return normalize_whitespace(name)

def normalize_phone(phone: Any) -> str:
    if not phone or str(phone).lower() == 'nan':
        return ""
    phone = re.sub(r'[^\d+]', '', str(phone))
    if phone.startswith('0'):
        phone = phone[1:]
    if phone.startswith('+91') and len(phone) > 3:
        phone = phone[3:]
    elif phone.startswith('91') and len(phone) == 12:
        phone = phone[2:]
    return phone

def normalize_vehicle(plate: Any) -> str:
    if not plate or str(plate).lower() == 'nan':
        return ""
    plate = str(plate).upper()
    plate = re.sub(r'[^A-Z0-9]', '', plate)
    return plate

def normalize_location(loc: Any) -> str:
    if not loc or str(loc).lower() == 'nan':
        return ""
    loc = remove_accents(loc).lower()
    loc = re.sub(r'[^\w\s]', '', loc)
    return normalize_whitespace(loc)
