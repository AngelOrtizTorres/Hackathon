import { useEffect, useRef, useState } from "react"
import { Play, RotateCcw, CloudDrizzle, Wind, Clock } from "lucide-react"

// Zonas de Córdoba, España con sus coordenadas centrales
const ZONAS_CORDOBA = [
  { id: 'centro', nombre: 'Centro', lat: 37.8718, lng: -4.7800 },
  { id: 'norte', nombre: 'Zona Norte', lat: 37.91, lng: -4.78 },
  { id: 'sur', nombre: 'Zona Sur', lat: 37.83, lng: -4.78 },
  { id: 'este', nombre: 'Zona Este', lat: 37.87, lng: -4.72 },
  { id: 'oeste', nombre: 'Zona Oeste', lat: 37.87, lng: -4.84 },
]

const sensibilidad = {
  "sensor-01": 1.8,
  "sensor-02": 2.2,
  "sensor-03": 1.5,
  "sensor-04": 1.0,
  "sensor-05": 2.5,
  "sensor-06": 1.2
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

  // Cargar sensores de la API
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

  // Calcular nivel máximo que alcanzará cada sensor
  function calcularNivelMax(sensor, nivelActual) {
    const incrementoLluvia = lluvia * (sensibilidad[sensor.id] ?? 1.0)
    const factorViento = 1 + (viento / 100)
    const incrementoConViento = incrementoLluvia * factorViento

    let incrementoHistorico = 0
    if (Array.isArray(sensor?.historico) && sensor.historico.length > 0) {
      const episodioSimilar = sensor.historico.reduce((prev, curr) =>
        Math.abs(curr.lluvia_mm - lluvia) < Math.abs(prev.lluvia_mm - lluvia) ? curr : prev
      )
      
      if (episodioSimilar?.nivel_maximo != null) {
        incrementoHistorico = episodioSimilar.nivel_maximo * 0.2
      }
    }

    const incrementoFinal = Math.max(incrementoConViento, incrementoHistorico)
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
      const t = paso / pasos

      const nuevosNiveles = {}
      sensores.forEach((sensor) => {
        const nivelActual = sensor?.actual?.nivel ?? 10
        const nivelMax = calcularNivelMax(sensor, nivelActual)
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

    const nivelesReset = {}
    sensores.forEach((sensor) => {
      const actualNivel = sensor?.actual?.nivel ?? 10
      nivelesReset[sensor.id] = Math.max(0, Math.min(100, actualNivel))
    })
    setNiveles(nivelesReset)
    
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
    <div className="flex flex-col gap-3 h-full">
      {/* Controles de Lluvia */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 justify-between">
          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <CloudDrizzle className="w-4 h-4 text-blue-400" />
            Lluvia
          </label>
          <span className="text-lg font-bold text-blue-300">{lluvia} mm</span>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          value={lluvia}
          onChange={(e) => setLluvia(Number(e.target.value))}
          disabled={simulando}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
        />
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
          <span>Ligera</span>
          <span className="text-center">Moderada</span>
          <span className="text-right">Torrencial</span>
        </div>
      </div>

      {/* Controles de Viento */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 justify-between">
          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400" />
            Viento
          </label>
          <span className="text-lg font-bold text-cyan-300">{viento} m/s</span>
        </div>
        <input
          type="range"
          min="0"
          max="70"
          value={viento}
          onChange={(e) => setViento(Number(e.target.value))}
          disabled={simulando}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50"
        />
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
          <span>Calmoso</span>
          <span className="text-center">Moderado</span>
          <span className="text-right">Huracán</span>
        </div>
      </div>

      {/* Controles de Duración */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 justify-between">
          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Duración
          </label>
          <span className="text-lg font-bold text-slate-300">{duracion}s</span>
        </div>
        <input
          type="range"
          min="10"
          max="60"
          value={duracion}
          onChange={(e) => setDuracion(Number(e.target.value))}
          disabled={simulando}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-500 disabled:opacity-50"
        />
      </div>

      {/* Progreso de Simulación */}
      {simulando && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span className="font-semibold">Simulando...</span>
            <span className="font-bold text-blue-300">{progreso}%</span>
          </div>
          <div className="progress-bar severity-info">
            <div className="progress-fill" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="flex gap-2 pt-2">
        {!simulando && !terminado && (
          <button
            onClick={iniciarSimulacion}
            disabled={sensores.length === 0}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Iniciar
          </button>
        )}

        {terminado && (
          <button
            onClick={resetSimulacion}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </button>
        )}
      </div>

      {/* Selector de Zona */}
      <div className="pt-2 border-t border-slate-700">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Seleccionar zona
        </label>
        <select
          value={zonaSeleccionada?.id || ""}
          onChange={handleZonaChange}
          className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2 text-sm cursor-pointer hover:border-slate-600 transition-colors focus:outline-none focus:border-blue-500"
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
  )
}