import { useState, useEffect } from "react"
import { AlertTriangle, AlertCircle, CheckCircle2, Cloud, Wind, Droplets } from "lucide-react"
import Mapa from "./Mapa.jsx"
import Simulador from "./Simulador.jsx"
import Tiempo from "./Tiempo.jsx"

export default function Dashboard() {
  const [lluvia, setLluvia] = useState(0)
  const [viento, setViento] = useState(0)
  const [nivelesSimulados, setNivelesSimulados] = useState(null)
  const [sensores, setSensores] = useState([])
  const [niveles, setNiveles] = useState({})
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [cuadrillasEnviadas, setCuadrillasEnviadas] = useState({})

  // Cargar sensores para mostrar alertas
  useEffect(() => {
    const cargarSensores = async () => {
      try {
        const response = await fetch("https://hackathon-rwpe.onrender.com/sensores")
        if (!response.ok) throw new Error("Error")
        const datos = await response.json()
        setSensores(Array.isArray(datos) ? datos : [])
        
        const nivelesInit = {}
        ;(Array.isArray(datos) ? datos : []).forEach((s) => {
          nivelesInit[s.id] = s?.actual?.nivel ?? 10
        })
        setNiveles(nivelesInit)
      } catch (e) {
        console.error("Error cargando sensores:", e)
      }
    }

    cargarSensores()
    const intervalo = setInterval(cargarSensores, 10000)
    return () => clearInterval(intervalo)
  }, [])

  // Actualizar niveles del simulador
  const handleSimuladorNiveles = (nuevosNiveles) => {
    setNivelesSimulados(nuevosNiveles)
    setNiveles(nuevosNiveles)
  }

  // Calcular alertas
  const criticos = sensores.filter((s) => (niveles[s.id] ?? 0) > 80)
  const alertas = sensores.filter((s) => {
    const n = niveles[s.id] ?? 0
    return n > 50 && n <= 80
  })
  const normales = sensores.filter((s) => (niveles[s.id] ?? 0) <= 50)

  // Enviar cuadrilla
  const handleEnviarCuadrilla = (sensorId, sensorNombre) => {
    setCuadrillasEnviadas((prev) => ({
      ...prev,
      [sensorId]: true,
    }))
    console.log(`Cuadrilla enviada a ${sensorNombre}`)
  }

  const EstadoSensor = ({ sensor, nivel, enviado }) => (
    <div className="group card-hover animate-slide-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{sensor.nombre}</p>
          <p className="text-xs text-slate-400 mt-1">{sensor.ubicacion || "Sin ubicación"}</p>
        </div>
        <div className={`flex items-center gap-1 badge ${
          nivel > 80 ? 'badge-critical' : nivel > 50 ? 'badge-warning' : 'badge-success'
        }`}>
          <span className="font-bold">{nivel.toFixed(0)}%</span>
        </div>
      </div>

      <div className={`progress-bar severity-${nivel > 80 ? 'critical' : nivel > 50 ? 'warning' : 'success'} mb-3`}>
        <div className="progress-fill" style={{ width: `${Math.min(100, nivel)}%` }} />
      </div>

      {nivel > 50 && (
        <button
          onClick={() => handleEnviarCuadrilla(sensor.id, sensor.nombre)}
          disabled={enviado}
          className={`w-full text-xs font-semibold py-2 rounded-lg transition-all duration-300 ${
            enviado
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg hover:shadow-blue-500/50'
          }`}
        >
          {enviado ? '✓ Cuadrilla enviada' : '🚨 Enviar equipo'}
        </button>
      )}
    </div>
  )

  return (
    <div className="w-full h-[calc(100vh-73px)] bg-slate-900/50">
      <div className="flex gap-6 h-full p-6 max-w-8xl mx-auto">
        {/* Mapa izquierda - Principal */}
        <div className="flex-1 card overflow-hidden shadow-2xl border-2 border-slate-700/50">
          <Mapa 
            lluviaMM={lluvia} 
            vientoMs={viento} 
            nivelesSimulados={nivelesSimulados} 
            zonaSeleccionada={zonaSeleccionada} 
          />
        </div>

        {/* Panel derecho - Controles y Alertas */}
        <div className="w-96 flex flex-col gap-4 overflow-hidden">
          {/* Tiempo y Condiciones */}
          <div className="card">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-400" />
              Condiciones
            </h2>
            <Tiempo
              onDatosActualizados={(lluviaMM, vientoMs) => {
                setLluvia(lluviaMM)
                setViento(vientoMs)
              }}
            />
          </div>

          {/* Simulador */}
          <div className="card flex-1 overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-400" />
              Simulador
            </h2>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <Simulador
                onNivelesActualizados={handleSimuladorNiveles}
                onReiniciar={() => {
                  setNivelesSimulados(null)
                  const nivelesReales = {}
                  sensores.forEach((s) => {
                    nivelesReales[s.id] = s?.actual?.nivel ?? 10
                  })
                  setNiveles(nivelesReales)
                }}
                onZonaSeleccionada={setZonaSeleccionada}
              />
            </div>
          </div>

          {/* Alertas */}
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto scrollbar-thin">
            {/* Críticos */}
            {criticos.length > 0 && (
              <div className="card gradient-critical">
                <h3 className="text-sm font-bold text-red-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  Críticos ({criticos.length})
                </h3>
                <div className="space-y-2">
                  {criticos.map((s) => (
                    <EstadoSensor 
                      key={s.id} 
                      sensor={s} 
                      nivel={niveles[s.id] ?? 0} 
                      enviado={cuadrillasEnviadas[s.id]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Alertas */}
            {alertas.length > 0 && (
              <div className="card gradient-warning">
                <h3 className="text-sm font-bold text-orange-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4" />
                  Alertas ({alertas.length})
                </h3>
                <div className="space-y-2">
                  {alertas.map((s) => (
                    <EstadoSensor 
                      key={s.id} 
                      sensor={s} 
                      nivel={niveles[s.id] ?? 0}
                      enviado={cuadrillasEnviadas[s.id]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Estado normal */}
            {criticos.length === 0 && alertas.length === 0 && (
              <div className="card gradient-success">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm font-semibold text-green-300">Sistema Normal</p>
                      <p className="text-xs text-slate-400">{sensores.length} sensores monitoreados</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}