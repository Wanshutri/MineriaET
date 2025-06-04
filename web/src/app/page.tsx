"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";

type ApiResponse = Record<string, any> | null;

export default function Home() {
  // ─── STATE HOOKS FOR FORM FIELDS ─────────────────────────────────────────
  const [rainTomorrow, setRainTomorrow] = useState<boolean>(false);
  const [rainToday, setRainToday] = useState<boolean>(false);

  // Number spinners with their respective min/max constraints:
  const [rainfall, setRainfall] = useState<number>(0);       // 0–371
  const [humidity3pm, setHumidity3pm] = useState<number>(0); // 0–45
  const [cloud3pm, setCloud3pm] = useState<number>(0);       // 0–8
  const [sunshine, setSunshine] = useState<number>(0);       // 0–17

  // For toast
  const [toastMessage, setToastMessage] = useState<string>("");
  const [showToast, setShowToast] = useState<boolean>(false);

  // Loading / error
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // ─── HANDLER FUNCTIONS ────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setShowToast(false);
    setToastMessage("");

    const payload = {
      RainTomorrow: rainTomorrow ? 0 : 0,
      Rainfall: rainfall,
      Humidity3pm: humidity3pm,
      RainToday: rainToday ? 1 : 0,
      Cloud3pm: cloud3pm,
      Sunshine: sunshine,
    };

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      const data: Record<string, any> = await res.json();

      if (data.prediction && Array.isArray(data.prediction)) {
        const predictionValue = data.prediction[0];
        const roundedPrediction = (predictionValue * 100).toFixed(2); // Porcentaje con 2 decimales
        setToastMessage(`Prediction: ${roundedPrediction} mm`);
      } else {
        setToastMessage("Prediction data is not valid.");
      }

      setShowToast(true);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
      // Show error toast
      setToastMessage(`Error: ${err.message}`);
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage("");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-semibold">Predictor de Lluvia en MM</h1>
        </header>

        {/* Main content */}
        <main className="grid m-auto w-100">
          {/* LEFT COLUMN: FORM */}
          <div>
            <form
              onSubmit={handleSubmit}
              className="space-y-6 bg-white shadow-md rounded-lg p-6"
            >
              {/* Rain Tomorrow (checkbox) 
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rain-tomorrow"
                  name="rainTomorrow"
                  checked={rainTomorrow}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setRainTomorrow(e.target.checked)
                  }
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="rain-tomorrow"
                  className="ml-2 block text-sm font-medium text-gray-700"
                >
                  Rain Tomorrow
                </label>
              </div>
              */}

              {/* Rainfall (spinner 0–371) */}
              <div>
                <label
                  htmlFor="rainfall"
                  className="block text-sm font-medium text-gray-700"
                >
                  Rainfall (0–371)
                </label>
                <input
                  type="number"
                  id="rainfall"
                  name="rainfall"
                  min={0}
                  max={371}
                  value={rainfall}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setRainfall(
                      Math.max(0, Math.min(371, parseInt(e.target.value || "0")))
                    )
                  }
                  className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Humidity3pm (spinner 0–45) */}
              <div>
                <label
                  htmlFor="humidity3pm"
                  className="block text-sm font-medium text-gray-700"
                >
                  Humidity at 3pm (0–45)
                </label>
                <input
                  type="number"
                  id="humidity3pm"
                  name="humidity3pm"
                  min={0}
                  max={45}
                  value={humidity3pm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setHumidity3pm(
                      Math.max(0, Math.min(45, parseInt(e.target.value || "0")))
                    )
                  }
                  className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rain Today (checkbox) */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rain-today"
                  name="rainToday"
                  checked={rainToday}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setRainToday(e.target.checked)
                  }
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="rain-today"
                  className="ml-2 block text-sm font-medium text-gray-700"
                >
                  Rain Today
                </label>
              </div>

              {/* Cloud3pm (spinner 0–8) */}
              <div>
                <label
                  htmlFor="cloud3pm"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cloud Level at 3pm (0–8)
                </label>
                <input
                  type="number"
                  id="cloud3pm"
                  name="cloud3pm"
                  min={0}
                  max={8}
                  value={cloud3pm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCloud3pm(
                      Math.max(0, Math.min(8, parseInt(e.target.value || "0")))
                    )
                  }
                  className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sunshine (spinner 0–17) */}
              <div>
                <label
                  htmlFor="sunshine"
                  className="block text-sm font-medium text-gray-700"
                >
                  Sunshine (0–17)
                </label>
                <input
                  type="number"
                  id="sunshine"
                  name="sunshine"
                  min={0}
                  max={17}
                  value={sunshine}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSunshine(
                      Math.max(0, Math.min(17, parseInt(e.target.value || "0")))
                    )
                  }
                  className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white ${isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {isLoading ? "Prediciendo" : "Predecir"}
                </button>
              </div>

              {/* Error message below form */}
              {errorMsg && (
                <p className="text-red-600 text-sm text-center">{errorMsg}</p>
              )}
            </form>
          </div>
          {
            showToast && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded shadow-lg">
                {toastMessage}
              </div>
            )
          }
        </main>
      </div>
    </div>
  )
}