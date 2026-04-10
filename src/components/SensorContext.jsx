// SensorContext.jsx

import { createContext, useContext, useEffect, useRef, useState } from "react"

// Sensores reales de tu mapa
const sensoresBase = [
  {
    id: "sensor-01",
    nombre: "Jardin Botanico",
    lat: 37.867682,
    lng: -4.786393,
  },
  {
    id: "sensor-02",
    nombre: "Avenida de Corregidor",
    lat: 37.873105,
    lng: -4.785686,
  },
  {
    id: "sensor-03",
    nombre: "Av. Fray Albino",
    lat: 37.871733,
    lng: -4.78079,
  },
]

// Episodios históricos
const episodios = [
  { lluvia_mm: 5, nivel_maximo: 50, caudal_maximo: 170 },
  { lluvia_mm: 10, nivel_maximo: 65, caudal_maximo: 280 },
  { lluvia_mm: 20, nivel_maximo: 80, caudal_maximo: 420 },
  { lluvia_mm: 35, nivel_maximo: 95, caudal_maximo: 600 },
]

// Función de tick para simular cambios en tiempo real
function tickSensor(sensor) {
  const r = Math.random()
  const nivel = sensor.actual.nivel
    ? Math.max(0, Math.min(100, sensor.actual.nivel + (r - 0.5) * 10))
    : r < 0.7 ? Math.floor(30 + r * 40)
    : null

  const caudal = sensor.actual.caudal
    ? Math.max(0, Math.min(1000, sensor.actual.caudal + (r - 0.5) * 100))
    : r < 0.5 ? Math.floor(100 + r * 400)
    : null

  return {
    ...sensor,
    actual: { nivel, caudal },
    historico: episodios,
  }
}

// Contexto
const SensorContext = createContext()

export const useSensorContext = () => {
  const ctx = useContext(SensorContext)
  if (!ctx) throw new Error("useSensorContext must be used within SensorProvider")
  return ctx
}

export const SensorProvider = ({ children, usarSimulador = false }) => {
  const [sensores, setSensores] = useState([])
  const timerRef = useRef(null)

  useEffect(() => {
    const initial = sensoresBase.map((s) => ({
      ...s,
      actual: {
        nivel: Math.floor(30 + Math.random() * 40),
        caudal: Math.floor(100 + Math.random() * 400),
      },
      historico: episodios,
    }))
    setSensores(initial)
  }, [])

  // Simulation loop (1s tick)
  useEffect(() => {
    if (!usarSimulador) return

    timerRef.current = setInterval(() => {
      setSensores((prev) => prev.map(tickSensor))
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [usarSimulador])

  // Función para obtener los datos como si fuera /sensores
  const getSensoresData = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100)) // latencia artificial
    return sensores
  }

  return (
    <SensorContext.Provider
      value={{
        sensores,         // datos actuales
        getSensoresData,  // para simular fetch('/sensores')
        usarSimulador,
        setUsarSimulador: (v) => {
          const newState = typeof v === "function" ? v(usarSimulador) : v
          timerRef.current && clearInterval(timerRef.current)
          if (newState) {
            setSensores((prev) => prev.map(tickSensor))
          }
          // Aquí podrías volver a setUsarSimulador correctamente si usas un estado propio
        },
      }}
    >
      {children}
    </SensorContext.Provider>
  )
}