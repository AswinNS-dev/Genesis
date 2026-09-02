def format_human_explanation(feature, value, direction):
    """
    Converts technical feature names and values into investigator-readable explanations.
    """
    try:
        val_float = float(value)
    except:
        val_float = 0.0
        
    explanations = {
        "communication_frequency": f"The entities have communicated {int(val_float)} times, which is highly significant.",
        "average_call_duration": f"The average call duration between them was {int(val_float)} seconds.",
        "transaction_count": f"There are {int(val_float)} recorded financial transactions between these entities.",
        "total_amount": f"A total of {val_float} INR was transferred between them.",
        "shared_case_count": f"These entities appear together in {int(val_float)} other case investigations.",
        "evidence_count": f"The relationship is backed by {int(val_float)} direct evidence records.",
        "multi_source_support": f"{int(val_float)} independent intelligence sources support this relationship.",
        "visit_count": f"The entity was observed at this location {int(val_float)} times.",
        "night_visit_ratio": f"An unusually high {int(val_float*100)}% of visits occurred during late night hours."
    }
    
    explanation = explanations.get(feature, f"Feature {feature} with value {value} contributed {direction}ly.")
    
    # Append lead disclaimer if positive contribution
    if direction == "positive":
        explanation += " This pattern may warrant further investigation."
        
    return explanation
