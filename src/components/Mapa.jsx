import { useEffect, useRef, useState } from "react"
import { Filter, Map as MapIcon } from "lucide-react"

function getTipoSensor(sensor) {
  const tieneNivel = sensor?.actual?.nivel != null
  const tieneCaudal = sensor?.actual?.caudal != null
  if (tieneNivel && tieneCaudal) return "ambos"
  if (tieneNivel) return "nivel"
  return "caudal"
}

function calcularRiesgo(sensor, nivelSimulado = null, lluviaMM = 0, vientoMs = 0) {
  let puntuacion = 0
  if (nivelSimulado !== null && nivelSimulado !== undefined) {
    return Math.min(100, Math.max(0, nivelSimulado))
  }
  if (sensor?.actual?.nivel != null) puntuacion += sensor.actual.nivel * 0.6
  if (sensor?.actual?.caudal != null) {
    puntuacion += sensor.actual.caudal > 300 ? 25 : sensor.actual.caudal > 150 ? 12 : 0
  }
  if (Array.isArray(sensor?.historico) && sensor.historico.length > 0) {
    const episodio = sensor.historico.reduce((prev, curr) =>
      Math.abs(curr.lluvia_mm - lluviaMM) < Math.abs(prev.lluvia_mm - lluviaMM) ? curr : prev
    )
    if (episodio?.nivel_maximo != null) puntuacion += episodio.nivel_maximo * 0.3
    if (episodio?.caudal_maximo != null) puntuacion += episodio.caudal_maximo > 350 ? 15 : 5
  }
  if (vientoMs > 10) puntuacion += vientoMs * 0.3
  return Math.min(100, puntuacion)
}

function getColor(riesgo) {
  if (riesgo > 80) return "#ef4444"
  if (riesgo > 50) return "#f97316"
  return "#22c55e"
}

function getEstado(riesgo) {
  if (riesgo > 80) return "CRÍTICO"
  if (riesgo > 50) return "ALERTA"
  return "NORMAL"
}

function crearIcono(L, color, tipo, riesgo) {
  const pulso = riesgo > 80 ? "animation: pulse 1.5s infinite;" : ""
  const glow = `0 0 12px ${color}${riesgo > 80 ? ', 0 0 20px ' + color + '80' : ''}`

  if (tipo === "caudal") {
    return L.divIcon({
      className: "",
      html: `<div style="
        width: 20px; height: 20px;
        background: ${color};
        transform: rotate(45deg);
        border: 2.5px solid white;
        border-radius: 2px;
        box-shadow: ${glow};
        ${pulso}
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }

  if (tipo === "ambos") {
    return L.divIcon({
      className: "",
      html: `<div style="
        width: 24px; height: 24px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: ${glow}, 0 0 0 2px ${color}40;
        ${pulso}
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }

  return L.divIcon({
    className: "",
    html: `<div style="
      width: 22px; height: 22px;
      background: ${color};
      border-radius: 50%;
      border: 2.5px solid white;
      box-shadow: ${glow};
      ${pulso}
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  })
}

export default function Mapa({ lluviaMM = 0, vientoMs = 0, reiniciarAPIData = false, nivelesSimulados = null, zonaSeleccionada = null }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const [sensores, setSensores] = useState([])
  const [usandoMock, setUsandoMock] = useState(false)
  const [filtro, setFiltro] = useState("todos")
  const [mostrarTodos, setMostrarTodos] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const response = await fetch("https://hackathon-rwpe.onrender.com/sensores")
        if (!response.ok) throw new Error("Error al cargar sensores")
        const datos = await response.json()
        setSensores(Array.isArray(datos) ? datos : [])
        setUsandoMock(false)
      } catch (e) {
        setSensores([])
        setUsandoMock(true)
      }
    }
    cargarDatos()
    const intervalo = setInterval(cargarDatos, 30000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    if (!reiniciarAPIData) return
    const cargarDatos = async () => {
      try {
        const response = await fetch("https://hackathon-rwpe.onrender.com/sensores")
        if (!response.ok) throw new Error()
        const datos = await response.json()
        setSensores(Array.isArray(datos) ? datos : [])
        setUsandoMock(false)
      } catch { }
    }
    cargarDatos()
  }, [reiniciarAPIData])

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return
    import("leaflet").then((L) => {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
      const map = L.map(mapRef.current).setView([37.8718, -4.7800], 15)
      mapInstance.current = map
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)
      setTimeout(() => map.invalidateSize(), 100)
    })
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !zonaSeleccionada) return
    mapInstance.current.setView([zonaSeleccionada.lat, zonaSeleccionada.lng], 15)
  }, [zonaSeleccionada])

  useEffect(() => {
    if (!mapInstance.current || sensores.length === 0) return

    import("leaflet").then((L) => {
      sensores.forEach((sensor) => {
        if (!Number.isFinite(sensor.lat) || !Number.isFinite(sensor.lng)) return

        const tipo = getTipoSensor(sensor)
        const visible = filtro === "todos" || filtro === tipo
        if (!visible) {
          if (markersRef.current[sensor.id]) {
            mapInstance.current.removeLayer(markersRef.current[sensor.id])
            delete markersRef.current[sensor.id]
          }
          return
        }

        const nivelSimulado = nivelesSimulados ? nivelesSimulados[sensor.id] : null
        const riesgo = calcularRiesgo(sensor, nivelSimulado, lluviaMM, vientoMs)

        if (!mostrarTodos && riesgo <= 50) {
          if (markersRef.current[sensor.id]) {
            mapInstance.current.removeLayer(markersRef.current[sensor.id])
            delete markersRef.current[sensor.id]
          }
          return
        }

        const color = getColor(riesgo)
        const estado = getEstado(riesgo)
        const icono = crearIcono(L, color, tipo, riesgo)

        const popup = `
          <div style="font-family: 'Segoe UI', sans-serif; min-width: 200px; padding: 8px">
            <b style="font-size: 15px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px">${sensor?.nombre ?? "Sin nombre"}</b>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 8px; font-weight: 500">
              ${tipo === "nivel" ? "📊 Sensor de nivel" : tipo === "caudal" ? "💧 Sensor de caudal" : "📊💧 Nivel y caudal"}
            </div>
            ${nivelSimulado !== null ? `<div style="font-size: 11px; color: #3b82f6; font-weight: bold; margin-bottom: 8px; background: #dbeafe; padding: 3px 6px; border-radius: 3px; display: inline-block">🔬 SIMULACIÓN ACTIVA</div>` : ""}
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e2e8f0"/>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px">
              <span style="color:#64748b; font-size: 12px">Estado</span>
              <b style="color:${color}; font-size: 12px">${estado}</b>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:6px">
              <span style="color:#64748b; font-size: 12px">Riesgo</span>
              <b style="font-size: 12px">${riesgo.toFixed(0)}%</b>
            </div>
            ${sensor?.actual?.nivel != null && nivelSimulado === null ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:6px">
              <span style="color:#64748b; font-size: 12px">Nivel actual</span>
              <b style="font-size: 12px">${sensor.actual.nivel}%</b>
            </div>` : ""}
            ${sensor?.actual?.caudal != null && nivelSimulado === null ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:6px">
              <span style="color:#64748b; font-size: 12px">Caudal actual</span>
              <b style="font-size: 12px">${sensor.actual.caudal} L/s</b>
            </div>` : ""}
            <div style="margin-top:8px; background:#f1f5f9; border-radius:4px; height:6px; overflow: hidden">
              <div style="width:${riesgo}%; height:100%; background:${color}; border-radius:4px;"></div>
            </div>
          </div>
        `

        if (markersRef.current[sensor.id]) {
          markersRef.current[sensor.id].setIcon(icono)
          markersRef.current[sensor.id].setPopupContent(popup)
        } else {
          const marker = L.marker([sensor.lat, sensor.lng], { icon: icono })
            .addTo(mapInstance.current)
            .bindPopup(popup)
          markersRef.current[sensor.id] = marker
        }
      })

      mapInstance.current.invalidateSize()
    })
  }, [sensores, lluviaMM, vientoMs, nivelesSimulados, filtro, mostrarTodos])

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
      <div className="relative h-full w-full rounded-xl overflow-hidden bg-slate-100">
        {/* Controles de Filtro */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
          <div className="flex gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-2 flex-wrap">
            {[
              { key: "todos", label: "Todos" },
              { key: "nivel", label: "Nivel" },
              { key: "caudal", label: "Caudal" },
              { key: "ambos", label: "Ambos" }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${
                  filtro === key
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/50"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Leyenda Profesional */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-slate-950/95 backdrop-blur-md border border-slate-700 rounded-lg p-4 shadow-2xl max-w-xs">
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <MapIcon className="w-4 h-4 text-blue-400" />
              <p className="font-bold text-white uppercase tracking-wider text-xs">Legend</p>
            </div>

            {/* Tipos de Sensores */}
            <div>
              <p className="text-slate-400 font-semibold mb-2 uppercase text-xs">Tipo de Sensor</p>
              <div className="space-y-1.5 ml-1">
                <div className="flex items-center gap-2">
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#64748b", border: "2px solid white" }} />
                  <span className="text-slate-300">Nivel</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: 14, height: 14, background: "#64748b", transform: "rotate(45deg)", border: "2px solid white" }} />
                  <span className="text-slate-300">Caudal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#64748b", border: "3px solid white" }} />
                  <span className="text-slate-300">Ambos</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-2">
              <p className="text-slate-400 font-semibold mb-2 uppercase text-xs">Nivel de Riesgo</p>
              <div className="space-y-1.5 ml-1">
                <div className="flex items-center gap-2">
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
                  <span className="text-slate-300">Normal ≤ 50%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f97316" }} />
                  <span className="text-slate-300">Alerta 50-80%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
                  <span className="text-slate-300">Crítico &gt; 80%</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-2">
              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={mostrarTodos}
                  onChange={(e) => setMostrarTodos(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-blue-500"
                />
                <span className="font-medium">Mostrar todos los sensores</span>
              </label>
            </div>
          </div>
        </div>

        {/* Estado datos simulados */}
        {usandoMock && (
          <div className="absolute top-4 right-4 z-[900] bg-orange-900/90 backdrop-blur-sm border border-orange-600 text-orange-300 text-xs px-3 py-2 rounded-lg font-semibold flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            Usando datos de demostración
          </div>
        )}

        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      </div>
    </>
  )
}