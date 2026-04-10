import os
from flask import Flask, jsonify
from flask_cors import CORS # Muy importante para que Astro no de error

app = Flask(__name__)
CORS(app) # Esto evita el error de "Cross-Origin" en el navegador de tu compañero

# Datos de ejemplo (Mock local) según el formato que acordasteis
sensores_db = [
  {
    "id": "sensor-01",
    "nombre": "Jardin Botanico",
    "lat": 37.867682,
    "lng": -4.786393,
    "actual": { "nivel": 45, "caudal": None },
    "historico": [
      { "lluvia_mm": 5, "nivel_maximo": 52 },
      { "lluvia_mm": 10, "nivel_maximo": 63 },
      { "lluvia_mm": 20, "nivel_maximo": 78 },
      { "lluvia_mm": 35, "nivel_maximo": 91 }
    ]
  },
  {
    "id": "sensor-02",
    "nombre": "Avenida de Corregidor",
    "lat": 37.873105,
    "lng": -4.785686,
    "actual": { "nivel": None, "caudal": 210 },
    "historico": [
      { "lluvia_mm": 5, "caudal_maximo": 180 },
      { "lluvia_mm": 10, "caudal_maximo": 280 },
      { "lluvia_mm": 20, "caudal_maximo": 410 },
      { "lluvia_mm": 35, "caudal_maximo": 580 }
    ]
  },
  {
    "id": "sensor-03",
    "nombre": "Av. Fray Albino",
    "lat": 37.871733,
    "lng": -4.780790,
    "actual": { "nivel": 62, "caudal": 190 },
    "historico": [
      { "lluvia_mm": 5, "nivel_maximo": 68, "caudal_maximo": 220 },
      { "lluvia_mm": 10, "nivel_maximo": 75, "caudal_maximo": 310 },
      { "lluvia_mm": 20, "nivel_maximo": 88, "caudal_maximo": 450 },
      { "lluvia_mm": 35, "nivel_maximo": 96, "caudal_maximo": 620 }
    ]
  }
]


@app.route('/sensores', methods=['GET'])
def get_sensores():
    return jsonify(sensores_db)

if __name__ == '__main__':
    # Esto lee el puerto que Render te asigna. Si no hay ninguno, usa el 8000 por defecto.
    port = int(os.environ.get('PORT', 8000))
    # Importante usar host='0.0.0.0'
    app.run(host='0.0.0.0', port=port)