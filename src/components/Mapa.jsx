// Mapa.jsx

import { useEffect, useRef, useState } from "react"

function calcularRiesgo(sensor, nivelSimulado = null, lluviaMM = 0, vientoMs = 0) {
  let puntuacion = 0

  // Si hay nivel simulado, usarlo directamente como riesgo
  if (nivelSimulado !== null && nivelSimulado !== undefined) {
    return Math.min(100, Math.max(0, nivelSimulado))
  }

  // Si no, calcular basado en datos reales + lluvia/viento
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

export default function Mapa({ lluviaMM = 0, vientoMs = 0, reiniciarAPIData = false, nivelesSimulados = null }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const [sensores, setSensores] = useState([])          // API data
  const [usandoMock, setUsandoMock] = useState(false)

  // Cargar datos de la API (y resetear si se pide)
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const response = await fetch("https://hackathon-rwpe.onrender.com/sensores")
        if (!response.ok) throw new Error("Error al cargar sensores")

        const datos = await response.json()
        const sensoresArray = Array.isArray(datos) ? datos : []

        setSensores(sensoresArray)
        setUsandoMock(false)
      } catch (e) {
        console.error("Error cargando sensores, usando mock:", e)
        // Aquí pondrías sensoresMock si existiera
        setSensores([])
        setUsandoMock(true)
      }
    }

    // Cargar al montar y refrescar cada 5s
    cargarDatos()
    const intervalo = setInterval(cargarDatos, 5000)

    return () => clearInterval(intervalo)
  }, [])

  // Cuando Astro pase `reiniciarAPIData=true`, forzamos recarga de sensores sin modificar mapa
  useEffect(() => {
    if (!reiniciarAPIData) return

    const cargarDatos = async () => {
      try {
        const response = await fetch("https://hackathon-rwpe.onrender.com/sensores")
        if (!response.ok) throw new Error("Error al cargar sensores")

        const datos = await response.json()
        const sensoresArray = Array.isArray(datos) ? datos : []

        setSensores(sensoresArray)
        setUsandoMock(false)
      } catch (e) {
        console.error("Error al cargar sensores tras reiniciar:", e)
      }
    }

    cargarDatos()
  }, [reiniciarAPIData])

  // Inicializar mapa una sola vez
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

  // Pintar o actualizar marcadores cuando cambian sensores o lluvia/viento
  useEffect(() => {
    if (!mapInstance.current || sensores.length === 0) return

    import("leaflet").then((L) => {
      sensores.forEach((sensor) => {
        if (!Number.isFinite(sensor.lat) || !Number.isFinite(sensor.lng)) return

        // Usar nivel simulado si existe, si no calcular riesgo normal
        const nivelSimulado = nivelesSimulados ? nivelesSimulados[sensor.id] : null
        const riesgo = calcularRiesgo(sensor, nivelSimulado, lluviaMM, vientoMs)
        const color = getColor(riesgo)
        const estado = getEstado(riesgo)

        const icono = L.divIcon({
          className: "",
          html: `<div style="
            width: 20px; height: 20px;
            background: ${color};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 10px ${color};
            ${riesgo > 80 ? "animation: pulse 1.5s infinite;" : ""}
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        const popup = `
          <div style="font-family: sans-serif; min-width: 180px; padding: 4px">
            <b style="font-size: 14px">${sensor?.nombre ?? "Sin nombre"}</b>
            ${nivelSimulado !== null ? `<div style="font-size: 12px; color: #3b82f6; font-weight: bold; margin-bottom: 4px;">🔬 SIMULACIÓN</div>` : ''}
            <hr style="margin: 6px 0; border-color: #eee"/>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px">
              <span style="color:#666">Estado</span>
              <b style="color:${color}">${estado}</b>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px">
              <span style="color:#666">Riesgo</span>
              <b>${riesgo.toFixed(0)}%</b>
            </div>
            ${nivelSimulado !== null ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px">
              <span style="color:#666">Nivel simulado</span>
              <b>${nivelSimulado.toFixed(0)}%</b>
            </div>` : ''}
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
  }, [sensores, lluviaMM, vientoMs, nivelesSimulados])

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