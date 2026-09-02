from backend.app.data_processing.normalization import (
    normalize_person_name,
    normalize_phone,
    normalize_vehicle,
    normalize_location,
    normalize_organization,
)

def test_entity_normalization():
    assert normalize_person_name("mr. rahul   kumar ") == "Rahul Kumar"
    assert normalize_phone("+91 98765-12345") == "9876512345"
    assert normalize_vehicle("dl-01 ab 1234") == "DL01AB1234"
    assert normalize_location("sector 18  noida ") == "Sector 18 Noida"
    assert normalize_organization("abc logistics pvt. ltd.") == "Abc Logistics"
