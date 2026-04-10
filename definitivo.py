import os
import time
import random
import threading
import psycopg2
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Función para conectar a Supabase usando la variable de entorno de Render
def get_db_connection():
    # Render nos dará esta URL. SSL es obligatorio para Supabase.
    DATABASE_URL = os.environ.get('DATABASE_URL')
    return psycopg2.connect(DATABASE_URL, sslmode='require')

# SIMULADOR: Actualiza la Base de Datos cada 10 segundos
def simulador_backend():
    print("--- Simulador Real-Time Supabase Iniciado ---")
    while True:
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            # Actualizamos nivel y caudal con valores aleatorios realistas para todos los sensores
            cur.execute("""
                UPDATE sensores 
                SET nivel_actual = nivel_actual + (random() * 4 - 2),
                    caudal_actual = caudal_actual + (random() * 10 - 5)
                WHERE nivel_actual BETWEEN 10 AND 95;
            """)
            
            conn.commit()
            cur.close()
            conn.close()
            print("Telemetría actualizada en Supabase.")
        except Exception as e:
            print(f"Error en simulador: {e}")
        
        time.sleep(10)

# Lanzar simulador en segundo plano
threading.Thread(target=simulador_backend, daemon=True).start()

# RUTA 1: Obtener estado actual de los sensores (Para el mapa)
@app.route('/sensores', methods=['GET'])
def get_sensores():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT id, nombre, lat, lng, nivel_actual, caudal_actual FROM sensores ORDER BY id;')
        rows = cur.fetchall()
        
        resultado = []
        for r in rows:
            resultado.append({
                "id": r[0],
                "nombre": r[1],
                "lat": float(r[2]),
                "lng": float(r[3]),
                "actual": {"nivel": int(r[4]), "caudal": int(r[5])}
            })
        
        cur.close()
        conn.close()
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# RUTA 2: Obtener histórico de 5 años (Para las gráficas)
@app.route('/historico/<sensor_id>', methods=['GET'])
def get_historico(sensor_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT año, lluvia_mm, nivel_medio, caudal_medio 
            FROM historico_precipitaciones 
            WHERE sensor_id = %s ORDER BY año ASC;
        """, (sensor_id,))
        rows = cur.fetchall()
        
        data = [{"año": r[0], "lluvia": float(r[1]), "nivel": r[2], "caudal": r[3]} for r in rows]
        
        cur.close()
        conn.close()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)