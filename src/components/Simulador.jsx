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
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const intervalRef = useRef(null)

  const [lluvia, setLluvia] = useState(15)
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

  // Calcular nivel máximo que alcanzará cada sensor simulando la lluvia
  function calcularNivelMax(sensor, nivelActual) {
    // El nivel máximo es el actual + incremento por lluvia
    const incremento = lluvia * (sensibilidad[sensor.id] ?? 1.0)
    return Math.min(100, nivelActual + incremento)
  }

  // Inicializar el mapa con los sensores de la API
  useEffect(() => {
    if (sensores.length === 0 || mapInstance.current) return

    import("leaflet").then((L) => {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)

      const map = L.map(mapRef.current).setView(
        [37.8718, -4.7760],
        15
      )
      mapInstance.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      sensores.forEach((sensor) => {
        const nivel = niveles[sensor.id] ?? sensor?.actual?.nivel ?? 10
        const color = getColor(nivel)
        const icono = L.divIcon({
          className: "",
          html: `<div style="
            width: 20px; height: 20px;
            background: ${color};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 10px ${color};
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        const marker = L.marker([sensor.lat, sensor.lng], { icon: icono })
          .addTo(map)
          .bindPopup(`<b>${sensor.nombre}</b><br/>Nivel: ${nivel.toFixed(0)}%`)

        markersRef.current[sensor.id] = marker
      })
    })
  }, [sensores, niveles])

  // Actualizar marcadores cuando cambian los niveles
  useEffect(() => {
    if (!mapInstance.current || sensores.length === 0) return

    import("leaflet").then((L) => {
      sensores.forEach((sensor) => {
        const nivel = niveles[sensor.id] ?? sensor?.actual?.nivel ?? 10
        const color = getColor(nivel)
        const marker = markersRef.current[sensor.id]
        if (!marker) return

        const icono = L.divIcon({
          className: "",
          html: `<div style="
            width: 20px; height: 20px;
            background: ${color};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 10px ${color};
            ${nivel > 80 ? "animation: pulse 1.5s infinite;" : ""}
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        marker.setIcon(icono)
        marker.setPopupContent(
          `<b>${sensor.nombre}</b><br/>` +
            `Nivel: ${nivel.toFixed(0)}%<br/>` +
            `Estado: ${getEstado(nivel)}`
        )
      })
    })
  }, [sensores, niveles])

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

      <div className="flex gap-4 h-full items-start">
        {/* Panel izquierdo - Configuración */}
        <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">
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

        {/* Mapa centro */}
        <div className="flex-1 h-full rounded-lg overflow-hidden shadow-lg">
          <div ref={mapRef} style={{ height: "100%", width: "100%", borderRadius: "8px" }} />
        </div>
      </div>
    </>
  )
}