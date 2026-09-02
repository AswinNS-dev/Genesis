import shap
import numpy as np

class LeadShapExplainer:
    def __init__(self, model):
        self.model = model
        # Using TreeExplainer for XGBoost
        self.explainer = shap.TreeExplainer(self.model.model)
        
    def explain_prediction(self, X_instance):
        """
        Returns top features for a single prediction.
        """
        shap_values = self.explainer.shap_values(X_instance)
        
        # If binary classification, shap_values is a matrix or list. For XGBoost binary, usually just array.
        if isinstance(shap_values, list):
            shap_vals = shap_values[1][0]
        else:
            shap_vals = shap_values[0]
            
        feature_names = X_instance.columns
        
        # Sort by absolute SHAP value
        indices = np.argsort(np.abs(shap_vals))[::-1]
        
        top_factors = []
        for idx in indices[:4]:
            val = shap_vals[idx]
            feature = feature_names[idx]
            top_factors.append({
                "feature": feature,
                "value": str(X_instance[feature].values[0]),
                "contribution": float(val),
                "direction": "positive" if val > 0 else "negative"
            })
            
        return top_factors
