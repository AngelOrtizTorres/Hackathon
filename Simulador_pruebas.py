import mysql.connector
import random
import time
from datetime import datetime

# Configuración de la base de datos (XAMPP por ahora)
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "emacsa_db"
}

# Configuración de los sensores: [id, nombre, lat, lng, nivel_base, caudal_base]
# El nivel_base es el punto de partida para la simulación
sensores_iniciales = [
  { id: "sensor-01", "nombre": "Avenida de Corregidor", "lat": 37.873105, "lng": -4.785686, "nivel": 91, "caudal": 410 },
  { id: "sensor-02", "nombre": "Jardín Botánico", "lat": 37.867682, "lng": -4.786393, "nivel": 78, "caudal": 290 },
  { id: "sensor-03", "nombre": "Av. Fray Albino", "lat": 37.871733, "lng": -4.780790, "nivel": 45, "caudal": 160 },
  { id: "sensor-04", "nombre": "Av. Conde de Vallellano", "lat": 37.876438, "lng": -4.786218, "nivel": 62, "caudal": 220 },
  { id: "sensor-05", "nombre": "Acera mira al río", "lat": 37.875659, "lng": -4.776240, "nivel": 30, "caudal": 95 },
  { id: "sensor-06", "nombre": "Calle de Pio XII", "lat": 37.871171, "lng": -4.774394, "nivel": 30, "caudal": 95 }
]

def simular_movimiento(valor_actual, variacion_max, min_val, max_val):
    """Simula un cambio suave en los datos para evitar saltos bruscos"""
    cambio = random.uniform(-variacion_max, variacion_max)
    nuevo_valor = valor_actual + cambio
    return max(min_val, min(max_val, nuevo_valor))

def ejecutar_simulador():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        print(f"🚀 [{datetime.now().strftime('%H:%M:%S')}] Conectado. Enviando telemetría...")

        while True:
            for s in sensores_iniciales:
                # Actualizamos los valores con realismo
                s["nivel"] = simular_movimiento(s["nivel"], 0.5, 0, 100)
                s["caudal"] = simular_movimiento(s["caudal"], 2.0, 50, 500)
                
                # Determinamos estado
                if s["nivel"] > 80: estado = "CRITICO"
                elif s["nivel"] > 60: estado = "AVISO"
                else: estado = "NORMAL"

                query = """
                INSERT INTO sensores (sensor_id, nombre, lat, lng, nivel, caudal, estado)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    nivel = VALUES(nivel), 
                    caudal = VALUES(caudal), 
                    estado = VALUES(estado),
                    ultima_actualizacion = CURRENT_TIMESTAMP
                """
                cursor.execute(query, (
                    s["id"], s["nombre"], s["lat"], s["lng"], 
                    round(s["nivel"], 2), round(s["caudal"], 2), estado
                ))
            
            conn.commit()
            print(f"📡 Datos actualizados: {len(sensores_iniciales)} sensores en línea.")
            time.sleep(5) # Envío cada 5 segundos

    except mysql.connector.Error as err:
        print(f"❌ Error: {err}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    ejecutar_simulador()