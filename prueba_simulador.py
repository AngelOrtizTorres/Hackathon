import os
import time
import random
import threading
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
# CORS permite que el Dashboard de tu compañero lea los datos sin bloqueos
CORS(app)

# 1. Base de datos con los 6 sensores y su estructura profesional
sensores_db = [
    { "id": "sensor-01", "nombre": "Avenida de Corregidor", "lat": 37.873105, "lng": -4.785686, "actual": { "nivel": 91, "caudal": 410 } },
    { "id": "sensor-02", "nombre": "Jardín Botánico", "lat": 37.867682, "lng": -4.786393, "actual": { "nivel": 78, "caudal": 290 } },
    { "id": "sensor-03", "nombre": "Av. Fray Albino", "lat": 37.871733, "lng": -4.780790, "actual": { "nivel": 45, "caudal": 160 } },
    { "id": "sensor-04", "nombre": "Av. Conde de Vallellano", "lat": 37.876438, "lng": -4.786218, "actual": { "nivel": 62, "caudal": 220 } },
    { "id": "sensor-05", "nombre": "Acera mira al río", "lat": 37.875659, "lng": -4.776240, "actual": { "nivel": 30, "caudal": 95 } },
    { "id": "sensor-06", "nombre": "Calle de Pio XII", "lat": 37.871171, "lng": -4.774394, "actual": { "nivel": 30, "caudal": 95 } }
]

# 2. Lógica del Simulador (Hilo secundario)
def simulador_backend():
    print("--- Simulador de Telemetría Emacsa iniciado ---")
    while True:
        for s in sensores_db:
            # Variamos el nivel (+/- 2%) y caudal (+/- 5 unidades)
            # max/min para que el nivel no baje de 0 ni suba de 100
            s["actual"]["nivel"] = max(0, min(100, s["actual"]["nivel"] + random.randint(-2, 2)))
            s["actual"]["caudal"] = max(0, s["actual"]["caudal"] + random.randint(-5, 5))
        
        # Espera 10 segundos antes de la siguiente actualización
        time.sleep(10)

# Lanzamos el simulador en segundo plano al arrancar el servidor
threading.Thread(target=simulador_backend, daemon=True).start()

# 3. Rutas de la API
@app.route('/')
def home():
    return "API Emacsa: Simulador Real-Time Activo. Ve a /sensores para ver la telemetría."

@app.route('/sensores', methods=['GET'])
def get_sensores():
    # Cada vez que tu compañero haga un fetch, recibirá los datos actuales de la memoria
    return jsonify(sensores_db)

if __name__ == '__main__':
    # Configuración dinámica para el Render
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)