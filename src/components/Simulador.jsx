import { useEffect, useRef, useState } from "react"

// const sensoresBase = [...] ya no se usa aquí; se traen de la API
const sensibilidad = {
  "sensor-01": 1.8,
  "sensor-02": 2.2,
  "sensor-03": 1.5,
  "sensor-04": 1.0,
  "sensor-05": 2.5,
  "sensor-06": 1.2
}

function getColor(nivel) {
  if (nivel > 80) return "#ef4444"
  if (nivel > 50) return "#f97316"
  return "#22c55e"
}

function getEstado(nivel) {
  if (nivel > 80) return "CRÍTICO"
  if (nivel > 50) return "ALERTA"
  return "NORMAL"
}

export default function Simulador({ onNivelesActualizados, onReiniciar }) {
  const intervalRef = useRef(null)

  const [lluvia, setLluvia] = useState(15)
  const [viento, setViento] = useState(0)
  const [duracion, setDuracion] = useState(30)
  const [simulando, setSimulando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [sensores, setSensores] = useState([])
  const [niveles, setNiveles] = useState({})
  const [terminado, setTerminado] = useState(false)

  // Cargar sensores de la API (tipo Mapa)
  // Cargar sensores de la API con sus datos reales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const response = await fetch("https://hackathon-rwpe.onrender.com/sensores")
        if (!response.ok) throw new Error("Error al cargar sensores")

        const datos = await response.json()
        const sensoresArray = Array.isArray(datos) ? datos : []

        setSensores(sensoresArray)

        // Inicializar niveles con los datos ACTUALES de cada sensor
        const nivelesIniciales = {}
        sensoresArray.forEach((sensor) => {
          // Usar el nivel actual del sensor, o 10 como mínimo
          const actualNivel = sensor?.actual?.nivel ?? 10
          nivelesIniciales[sensor.id] = Math.max(0, Math.min(100, actualNivel))
        })
        setNiveles(nivelesIniciales)
      } catch (e) {
        console.error("Error al cargar sensores:", e)
      }
    }

    cargarDatos()
    const intervalo = setInterval(cargarDatos, 10000)
    return () => clearInterval(intervalo)
  }, [])

  // Emitir cambios de niveles al Dashboard
  useEffect(() => {
    if (onNivelesActualizados && Object.keys(niveles).length > 0) {
      onNivelesActualizados(niveles)
    }
  }, [niveles, onNivelesActualizados])

  // Calcular nivel máximo que alcanzará cada sensor con lluvia, viento y datos históricos
  function calcularNivelMax(sensor, nivelActual) {
    // 1. Incremento base por lluvia × sensibilidad del sensor
    const incrementoLluvia = lluvia * (sensibilidad[sensor.id] ?? 1.0)

    // 2. Factor multiplicador por viento (es un amplificador, no suma independiente)
    // A mayor viento, se amplifica más el efecto de la lluvia
    const factorViento = 1 + (viento / 100) // 30 m/s = +30% de amplificación
    const incrementoConViento = incrementoLluvia * factorViento

    // 3. Agregar referencia histórica (qué pasó en lluvia similar)
    let incrementoHistorico = 0
    if (Array.isArray(sensor?.historico) && sensor.historico.length > 0) {
      const episodioSimilar = sensor.historico.reduce((prev, curr) =>
        Math.abs(curr.lluvia_mm - lluvia) < Math.abs(prev.lluvia_mm - lluvia) ? curr : prev
      )
      
      if (episodioSimilar?.nivel_maximo != null) {
        // Histórico: qué nivel máximo se registró con lluvia similar
        // Ponderado al 20% (es información, pero el evento actual será diferente)
        incrementoHistorico = episodioSimilar.nivel_maximo * 0.2
      }
    }

    // Usar el máximo entre el incremental calculado O el histórico
    // (No sumarlos, usar el peor escenario)
    const incrementoFinal = Math.max(incrementoConViento, incrementoHistorico)

    // Retornar nivel actual + incremento final, limitado a 0-100
    return Math.min(100, Math.max(0, nivelActual + incrementoFinal))
  }

  function iniciarSimulacion() {
    if (simulando || sensores.length === 0) return
    setSimulando(true)
    setTerminado(false)
    setProgreso(0)

    const pasos = 50
    let paso = 0

    intervalRef.current = setInterval(() => {
      paso++
      const t = paso / pasos // 0 a 1 (progreso)

      const nuevosNiveles = {}
      sensores.forEach((sensor) => {
        // Nivel actual real del sensor
        const nivelActual = sensor?.actual?.nivel ?? 10
        // Nivel máximo si llueve la cantidad especificada
        const nivelMax = calcularNivelMax(sensor, nivelActual)
        // Interpolar linealmente desde actual hasta máximo
        nuevosNiveles[sensor.id] = nivelActual + (nivelMax - nivelActual) * t
      })

      setNiveles(nuevosNiveles)
      setProgreso(Math.round(t * 100))

      if (paso >= pasos) {
        clearInterval(intervalRef.current)
        setSimulando(false)
        setTerminado(true)
      }
    }, (duracion * 1000) / pasos)
  }

  function resetSimulacion() {
    clearInterval(intervalRef.current)
    setSimulando(false)
    setTerminado(false)
    setProgreso(0)

    // Volver a los niveles reales actuales de los sensores
    const nivelesReset = {}
    sensores.forEach((sensor) => {
      const actualNivel = sensor?.actual?.nivel ?? 10
      nivelesReset[sensor.id] = Math.max(0, Math.min(100, actualNivel))
    })
    setNiveles(nivelesReset)
    
    // Notificar al Dashboard
    if (onReiniciar) onReiniciar()
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>

      <div className="flex flex-col gap-4 overflow-y-auto">
        <h2 className="text-lg font-bold text-white">Simulador de Escenarios</h2>

        {/* Configuración */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              Configurar escenario
            </p>

            {/* Lluvia */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <label className="text-sm text-gray-300">Intensidad de lluvia</label>
                <span className="text-sm font-bold text-blue-400">{lluvia} mm</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={lluvia}
                onChange={(e) => setLluvia(Number(e.target.value))}
                disabled={simulando}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Ligera</span>
                <span>Moderada</span>
                <span>Torrencial</span>
              </div>
            </div>

            {/* Viento */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <label className="text-sm text-gray-300">Velocidad del viento</label>
                <span className="text-sm font-bold text-cyan-400">{viento} m/s</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={viento}
                onChange={(e) => setViento(Number(e.target.value))}
                disabled={simulando}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Calmoso</span>
                <span>Moderado</span>
                <span>Huracán</span>
              </div>
            </div>

            {/* Duración */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <label className="text-sm text-gray-300">Duración simulación</label>
                <span className="text-sm font-bold text-blue-400">{duracion}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                disabled={simulando}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Botones */}
            {!simulando && !terminado && (
              <button
                onClick={iniciarSimulacion}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                ▶ Iniciar simulación
              </button>
            )}

            {simulando && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Simulando...</span>
                  <span>{progreso}%</span>
                </div>
                <div className="bg-gray-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
              </div>
            )}

            {terminado && (
              <button
                onClick={resetSimulacion}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                🔄 Reiniciar
              </button>
            )}
        </div>
      </div>
    </>
  )
}