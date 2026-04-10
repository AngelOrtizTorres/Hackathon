import { useState, useEffect } from "react"
import Mapa from "./Mapa.jsx"
import Simulador from "./Simulador.jsx"
import Tiempo from "./Tiempo.jsx"

export default function Dashboard() {
  const [lluvia, setLluvia] = useState(0)
  const [viento, setViento] = useState(0)
  const [nivelesSimulados, setNivelesSimulados] = useState(null)
  const [sensores, setSensores] = useState([])
  const [niveles, setNiveles] = useState({})

  // Cargar sensores para mostrar alertas
  useEffect(() => {
    const cargarSensores = async () => {
      try {
        const response = await fetch("https://hackathon-rwpe.onrender.com/sensores")
        if (!response.ok) throw new Error("Error")
        const datos = await response.json()
        setSensores(Array.isArray(datos) ? datos : [])
        
        const nivelesInit = {}
        (Array.isArray(datos) ? datos : []).forEach((s) => {
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

  // Actualizar niveles del simulador (tanto para mapa como para alertas)
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

  return (
    <div className="flex gap-4 h-screen p-4">
      {/* Mapa izquierda - Flexible */}
      <div className="flex-1 h-full border-4 rounded-xl border-gray-300 overflow-hidden shadow-lg min-w-0">
        <Mapa lluviaMM={lluvia} vientoMs={viento} nivelesSimulados={nivelesSimulados} />
      </div>

      {/* Centro: Tiempo arriba + Simulador abajo */}
      <div className="w-96 shrink-0 flex flex-col gap-4 min-w-0">
        {/* Lluvia y Viento */}
        <div className="shrink-0">
          <Tiempo
            onDatosActualizados={(lluviaMM, vientoMs) => {
              setLluvia(lluviaMM)
              setViento(vientoMs)
            }}
          />
        </div>

        {/* Simulador */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Simulador
            lluviaMM={lluvia}
            vientoMs={viento}
            onNivelesActualizados={handleSimuladorNiveles}
            onReiniciar={() => {
              setNivelesSimulados(null)
              // Resetear niveles a datos reales
              const nivelesReales = {}
              sensores.forEach((s) => {
                nivelesReales[s.id] = s?.actual?.nivel ?? 10
              })
              setNiveles(nivelesReales)
            }}
          />
        </div>
      </div>

      {/* Alertas derecha - Full height */}
      <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">
        {criticos.length > 0 && (
          <div className="bg-red-950 border border-red-600 rounded-lg p-4 flex flex-col gap-3 shadow-lg flex-shrink-0">
            <p className="text-sm text-red-300 uppercase font-bold tracking-wider">⚠️ CRÍTICOS ({criticos.length})</p>
            <div className="space-y-2">
              {criticos.map((s) => (
                <div key={s.id} className="bg-red-900 bg-opacity-40 p-3 rounded hover:bg-opacity-60 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-semibold">{s.nombre}</span>
                    <span className="text-red-300 font-bold text-sm bg-red-900 px-2.5 py-1 rounded">{(niveles[s.id] ?? 0).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-red-900 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${Math.min(100, niveles[s.id] ?? 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alertas.length > 0 && (
          <div className="bg-orange-950 border border-orange-600 rounded-lg p-4 flex flex-col gap-3 shadow-lg flex-shrink-0">
            <p className="text-sm text-orange-300 uppercase font-bold tracking-wider">⚡ ALERTAS ({alertas.length})</p>
            <div className="space-y-2">
              {alertas.map((s) => (
                <div key={s.id} className="bg-orange-900 bg-opacity-40 p-3 rounded hover:bg-opacity-60 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-semibold">{s.nombre}</span>
                    <span className="text-orange-300 font-bold text-sm bg-orange-900 px-2.5 py-1 rounded">{(niveles[s.id] ?? 0).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-orange-900 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, niveles[s.id] ?? 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {criticos.length === 0 && alertas.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center text-gray-400 flex-shrink-0">
            <p className="text-sm">✅ Todos los sensores NORMALES</p>
          </div>
        )}
      </div>
    </div>
  )
}