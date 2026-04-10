import os
from flask import Flask, jsonify
from flask_cors import CORS # Muy importante para que Astro no de error

app = Flask(__name__)
CORS(app) # Esto evita el error de "Cross-Origin" en el navegador de tu compañero

# Datos de ejemplo (Mock local) según el formato que acordasteis
sensores_db = [
    {
        "id": "sensor-01",
        "nombre": "Avenida de Corregidor",
        "lat": 37.873105,
        "lng": -4.785686,
        "actual": { "nivel": 91, "caudal": 410 },
        "historico": [
            { "lluvia_mm": 5, "nivel_maximo": 52, "caudal_maximo": 180 },
            { "lluvia_mm": 20, "nivel_maximo": 85, "caudal_maximo": 390 }
        ]
    },
    {
        "id": "sensor-02",
        "nombre": "Jardín Botánico",
        "lat": 37.867682,
        "lng": -4.786393,
        "actual": { "nivel": 78, "caudal": 290 },
        "historico": [
            { "lluvia_mm": 5, "nivel_maximo": 40, "caudal_maximo": 150 },
            { "lluvia_mm": 20, "nivel_maximo": 70, "caudal_maximo": 260 }
        ]
    },
    {
        "id": "sensor-03",
        "nombre": "Av. Fray Albino",
        "lat": 37.871733,
        "lng": -4.780790,
        "actual": { "nivel": 45, "caudal": 160 },
        "historico": [
            { "lluvia_mm": 10, "nivel_maximo": 30, "caudal_maximo": 100 },
            { "lluvia_mm": 30, "nivel_maximo": 50, "caudal_maximo": 180 }
        ]
    },
    {
        "id": "sensor-04",
        "nombre": "Av. Conde de Vallellano",
        "lat": 37.876438,
        "lng": -4.786218,
        "actual": { "nivel": 62, "caudal": 220 },
        "historico": [
            { "lluvia_mm": 5, "nivel_maximo": 45, "caudal_maximo": 160 },
            { "lluvia_mm": 20, "nivel_maximo": 65, "caudal_maximo": 240 }
        ]
    },
    {
        "id": "sensor-05",
        "nombre": "Acera mira al río",
        "lat": 37.875659,
        "lng": -4.776240,
        "actual": { "nivel": 30, "caudal": 95 },
        "historico": [
            { "lluvia_mm": 5, "nivel_maximo": 20, "caudal_maximo": 70 },
            { "lluvia_mm": 20, "nivel_maximo": 35, "caudal_maximo": 110 }
        ]
    },
    {
        "id": "sensor-06",
        "nombre": "Calle de Pio XII",
        "lat": 37.871171,
        "lng": -4.774394,
        "actual": { "nivel": 30, "caudal": 95 },
        "historico": [
            { "lluvia_mm": 5, "nivel_maximo": 15, "caudal_maximo": 60 },
            { "lluvia_mm": 20, "nivel_maximo": 32, "caudal_maximo": 100 }
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