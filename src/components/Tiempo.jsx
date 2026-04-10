import { useEffect, useState } from "react"

const API_KEY = "51335f69cc5744901db829d157c5da0d"
const LAT = 37.8762
const LON = -4.7750

function getRiesgoLluvia(mm) {
  if (mm > 20) return { label: "Riesgo crítico de desbordamiento", color: "text-red-400", border: "border-red-500", bg: "bg-red-950", icono: "🔴" }
  if (mm > 10) return { label: "Riesgo moderado, vigilancia activa", color: "text-orange-400", border: "border-orange-500", bg: "bg-orange-950", icono: "🟠" }
  if (mm > 5) return { label: "Lluvia prevista, monitorización", color: "text-yellow-400", border: "border-yellow-500", bg: "bg-yellow-950", icono: "🟡" }
  return { label: "Sin riesgo previsto", color: "text-green-400", border: "border-green-700", bg: "bg-gray-900", icono: "✅" }
}

export default function Tiempo() {
  const [lluvia, setLluvia] = useState(null)
  const [viento, setViento] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric&lang=es`)
      .then(res => res.json())
      .then(data => {
        if (data.cod === "401" || data.cod === 401) {
          setError(true)
          return
        }
        // Próximo intervalo de 3 horas
        const proximo = data.list[0]
        const mmPrevistos = proximo.rain ? proximo.rain["3h"] ?? 0 : 0
        const vientoMs = proximo.wind.speed

        setLluvia(mmPrevistos)
        setViento(vientoMs)
      })
      .catch(() => setError(true))
  }, [])

  if (error) return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-1">
        <p className="text-gray-400 text-xs uppercase tracking-wider">🌧 Lluvia prevista</p>
        <p className="text-white text-lg font-bold">-- mm</p>
        <p className="text-gray-400 text-xs">Error cargando...</p>
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-1">
        <p className="text-gray-400 text-xs uppercase tracking-wider">💨 Viento previsto</p>
        <p className="text-white text-lg font-bold">-- m/s</p>
        <p className="text-gray-400 text-xs">Error cargando...</p>
      </div>
    </div>
  )

  if (lluvia === null) return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-1">
        <p className="text-gray-400 text-xs uppercase tracking-wider">🌧 Lluvia prevista</p>
        <p className="text-white text-lg font-bold">Cargando...</p>
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-1">
        <p className="text-gray-400 text-xs uppercase tracking-wider">💨 Viento previsto</p>
        <p className="text-white text-lg font-bold">Cargando...</p>
      </div>
    </div>
  )

  const riesgo = getRiesgoLluvia(lluvia)

  return (
    <div className="flex flex-col gap-3">
      {/* Widget Lluvia con alerta */}
      <div className={`${riesgo.bg} border ${riesgo.border} rounded-lg p-4 flex flex-col gap-2`}>
        <p className="text-gray-400 text-xs uppercase tracking-wider">🌧 Lluvia prevista</p>
        <p className="text-white text-lg font-bold">{lluvia.toFixed(1)} mm</p>
        <p className={`text-xs font-semibold ${riesgo.color}`}>
          {riesgo.icono} {riesgo.label}
        </p>
      </div>

      {/* Widget Viento */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col gap-2">
        <p className="text-gray-400 text-xs uppercase tracking-wider">💨 Viento previsto</p>
        <p className="text-white text-lg font-bold">{viento.toFixed(1)} m/s</p>
        <p className="text-gray-400 text-xs">Próximas 3 horas</p>
      </div>
    </div>
  )
}