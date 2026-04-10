import mysql.connector
import random
import time
from datetime import datetime

#-----------------------------------------------------# 
#                       Hackathon
#-----------------------------------------------------# 

# Configuración de conexión (Ajusta con tus credenciales)
db_config = {
    "host": "localhost",
    "user": "root", 
    "password": "",
    "database": "emacsa_db"
}

# Definición de los 5 sensores estratégicos (Zona Ribera)
sensores_iniciales = [
  { id: "sensor-01", "nombre": "Avenida de Corregidor", "lat": 37.873105, "lng": -4.785686, "nivel": 91, "caudal": 410 },
  { id: "sensor-02", "nombre": "Jardín Botánico", "lat": 37.867682, "lng": -4.786393, "nivel": 78, "caudal": 290 },
  { id: "sensor-03", "nombre": "Av. Fray Albino", "lat": 37.871733, "lng": -4.780790, "nivel": 45, "caudal": 160 },
  { id: "sensor-04", "nombre": "Av. Conde de Vallellano", "lat": 37.876438, "lng": -4.786218, "nivel": 62, "caudal": 220 },
  { id: "sensor-05", "nombre": "Acera mira al río", "lat": 37.875659, "lng": -4.776240, "nivel": 30, "caudal": 95 },
  { id: "sensor-06", "nombre": "Calle de Pio XII", "lat": 37.871171, "lng": -4.774394, "nivel": 30, "caudal": 95 }
]

def actualizar_sensores():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        for s in sensores_iniciales:
            # 1. Simular fluctuación (sube o baja un poco)
            s["nivel"] += random.uniform(-2, 2)
            s["caudal"] += random.uniform(-5, 5)

            # Mantener valores en rangos lógicos (0-100)
            s["nivel"] = max(0, min(100, s["nivel"]))
            
            # 2. Determinar estado basado en nivel
            if s["nivel"] > 85: estado = "critico"
            elif s["nivel"] > 70: estado = "advertencia"
            else: estado = "normal"

            # 3. Guardar en la base de datos (UPSERT)
            sql = """
            INSERT INTO sensores (sensor_id, nombre, lat, lng, nivel, caudal, estado)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                nivel = VALUES(nivel), 
                caudal = VALUES(caudal), 
                estado = VALUES(estado)
            """
            cursor.execute(sql, (s["id"], s["nombre"], s["lat"], s["lng"], round(s["nivel"], 2), round(s["caudal"], 2), estado))
        
        conn.commit()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Datos actualizados en MariaDB.")
        
        cursor.close()
        conn.close()

    except mysql.connector.Error as err:
        print(f"Error: {err}")

# Bucle infinito para simular tiempo real
if __name__ == "__main__":
    print("Simulador EMACSA iniciado...")
    while True:
        actualizar_sensores()
        time.sleep(10) # Actualiza cada 10 segundos