import { useEffect, useRef, useState } from "react"

// Zonas de Córdoba, España con sus coordenadas centrales
const ZONAS_CORDOBA = [
  { id: 'centro', nombre: 'Centro', lat: 37.8718, lng: -4.7800 },
  { id: 'norte', nombre: 'Zona Norte', lat: 37.91, lng: -4.78 },
  { id: 'sur', nombre: 'Zona Sur', lat: 37.83, lng: -4.78 },
  { id: 'este', nombre: 'Zona Este', lat: 37.87, lng: -4.72 },
  { id: 'oeste', nombre: 'Zona Oeste', lat: 37.87, lng: -4.84 },
]

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

export default function Simulador({ onNivelesActualizados, onReiniciar, onZonaSeleccionada }) {
  const intervalRef = useRef(null)

  const [lluvia, setLluvia] = useState(15)
  const [viento, setViento] = useState(0)
  const [duracion, setDuracion] = useState(30)
  const [simulando, setSimulando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [sensores, setSensores] = useState([])
  const [niveles, setNiveles] = useState({})
  const [terminado, setTerminado] = useState(false)
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)

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

  function handleZonaChange(e) {
    const zonaId = e.target.value
    const zona = ZONAS_CORDOBA.find((z) => z.id === zonaId)
    setZonaSeleccionada(zona || null)
    if (onZonaSeleccionada) {
      onZonaSeleccionada(zona || null)
    }
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

      <div className="flex flex-col gap-2 overflow-y-auto h-full">
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
                max="70"
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

        {/* Zonas de Córdoba - Fuera de la box */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-300">Seleccionar zona</label>
          <select
            value={zonaSeleccionada?.id || ""}
            onChange={handleZonaChange}
            className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg p-2 text-sm cursor-pointer hover:border-gray-500 transition-colors"
          >
            <option value="">-- Seleccionar zona --</option>
            {ZONAS_CORDOBA.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}