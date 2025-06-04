from fastapi import FastAPI
from utils import load_pkl_file
from pydantic import BaseModel
import numpy as np

model = load_pkl_file("pks/model.pkl")
scaler = load_pkl_file("pks/scaler.pkl")

class Item(BaseModel):
    """
    Input features expected by the prediction model.
    """
    RainTomorrow: int
    Rainfall: int
    Humidity3pm: int
    RainToday: int
    Cloud3pm: int
    Sunshine: int

if model is None or scaler is None:
    print("Failed to load one or more required files: model.pkl or scaler.pkl")

app = FastAPI()

@app.post("/api/predict")
def predict(item: Item):
    # Convert incoming JSON to a NumPy array (2D for model)
    input_data = np.array([[ 
        item.RainTomorrow,
        item.Rainfall,
        item.Humidity3pm,
        item.RainToday,
        item.Cloud3pm,
        item.Sunshine
    ]])

    # Scale the input
    input_scaled = scaler.transform(input_data)

    # Make prediction
    prediction = model.predict(input_scaled)

    return {
        "prediction": prediction.tolist()  # Convert NumPy type to JSON serializable
    }
