import { useEffect, useRef, useState } from "react"

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
  // Forma diferente según tipo
  // nivel → círculo, caudal → diamante, ambos → círculo con borde especial
  const pulso = riesgo > 80 ? "animation: pulse 1.5s infinite;" : ""

  if (tipo === "caudal") {
    return L.divIcon({
      className: "",
      html: `<div style="
        width: 18px; height: 18px;
        background: ${color};
        transform: rotate(45deg);
        border: 2px solid white;
        box-shadow: 0 0 10px ${color};
        ${pulso}
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })
  }

  if (tipo === "ambos") {
    return L.divIcon({
      className: "",
      html: `<div style="
        width: 20px; height: 20px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 10px ${color}, 0 0 0 2px ${color};
        ${pulso}
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }

  // nivel → círculo normal
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 20px; height: 20px;
      background: ${color};
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 10px ${color};
      ${pulso}
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
}

export default function Mapa({ lluviaMM = 0, vientoMs = 0, reiniciarAPIData = false, nivelesSimulados = null, zonaSeleccionada = null }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const [sensores, setSensores] = useState([])
  const [usandoMock, setUsandoMock] = useState(false)
  const [filtro, setFiltro] = useState("todos") // "todos" | "nivel" | "caudal" | "ambos"

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

        // Aplicar filtro
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

        // Solo mostrar sensores en ALERTA o superior (riesgo > 50)
        if (riesgo <= 50) {
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
          <div style="font-family: sans-serif; min-width: 180px; padding: 4px">
            <b style="font-size: 14px">${sensor?.nombre ?? "Sin nombre"}</b>
            <div style="font-size: 11px; color: #888; margin-bottom: 4px">
              ${tipo === "nivel" ? "📊 Sensor de nivel" : tipo === "caudal" ? "💧 Sensor de caudal" : "📊💧 Nivel y caudal"}
            </div>
            ${nivelSimulado !== null ? `<div style="font-size: 12px; color: #3b82f6; font-weight: bold; margin-bottom: 4px;">🔬 SIMULACIÓN</div>` : ""}
            <hr style="margin: 6px 0; border-color: #eee"/>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px">
              <span style="color:#666">Estado</span>
              <b style="color:${color}">${estado}</b>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px">
              <span style="color:#666">Riesgo</span>
              <b>${riesgo.toFixed(0)}%</b>
            </div>
            ${sensor?.actual?.nivel != null && nivelSimulado === null ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px">
              <span style="color:#666">Nivel actual</span>
              <b>${sensor.actual.nivel}%</b>
            </div>` : ""}
            ${sensor?.actual?.caudal != null && nivelSimulado === null ? `
            <div style="display:flex; justify-content:space-between">
              <span style="color:#666">Caudal actual</span>
              <b>${sensor.actual.caudal} L/s</b>
            </div>` : ""}
            <div style="margin-top:8px; background:#f3f4f6; border-radius:4px; height:6px">
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
  }, [sensores, lluviaMM, vientoMs, nivelesSimulados, filtro])

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
      <div className="relative h-full w-full rounded-xl overflow-hidden">

        {/* Botones de filtro encima del mapa */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex gap-2">
          {[
            { key: "todos", label: "Todos" },
            { key: "nivel", label: "📊 Nivel" },
            { key: "caudal", label: "💧 Caudal" },
            { key: "ambos", label: "📊💧 Ambos" }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filtro === key
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-900 border-gray-600 text-gray-300 hover:bg-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Leyenda */}
        <div className="absolute bottom-6 left-3 z-[1000] bg-gray-900 bg-opacity-90 border border-gray-700 rounded-xl p-3 flex flex-col gap-2 text-xs text-gray-300">
          <p className="font-semibold text-white mb-1">Tipo de sensor</p>
          <div className="flex items-center gap-2">
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#6b7280", border: "2px solid white" }} />
            <span>Nivel</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: 12, height: 12, background: "#6b7280", transform: "rotate(45deg)", border: "2px solid white" }} />
            <span>Caudal</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#6b7280", border: "3px solid white" }} />
            <span>Nivel y caudal</span>
          </div>
          <hr className="border-gray-700 my-1" />
          <p className="font-semibold text-white mb-1">Riesgo</p>
          <div className="flex items-center gap-2">
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f97316" }} />
            <span>Alerta</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
            <span>Crítico</span>
          </div>
        </div>

        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

        {usandoMock && (
          <div className="absolute top-2 right-2 bg-yellow-900 border border-yellow-600 text-yellow-400 text-xs px-2 py-1 rounded-lg">
            ⚠ Usando datos simulados
          </div>
        )}
      </div>
    </>
  )
}