import { useEffect, useState } from "react"
import { CloudRain, Wind, AlertTriangle, CheckCircle2 } from "lucide-react"

const API_KEY = "51335f69cc5744901db829d157c5da0d"
const LAT = 37.8762
const LON = -4.7750

function getRiesgoLluvia(mm) {
  if (mm > 20) return { 
    label: "Crítico", 
    desc: "Riesgo extremo de desbordamiento",
    severity: "critical", 
    icon: AlertTriangle 
  }
  if (mm > 10) return { 
    label: "Alto", 
    desc: "Vigilancia intensiva requerida",
    severity: "warning", 
    icon: AlertTriangle 
  }
  if (mm > 5) return { 
    label: "Moderado", 
    desc: "Monitorización activa",
    severity: "info", 
    icon: CloudRain 
  }
  return { 
    label: "Normal", 
    desc: "Sin riesgos previstos",
    severity: "success", 
    icon: CheckCircle2 
  }
}

export default function Tiempo({ onDatosActualizados }) {
  const [lluvia, setLluvia] = useState(null)
  const [viento, setViento] = useState(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric&lang=es`)
      .then(res => res.json())
      .then(data => {
        if (data.cod === "401" || data.cod === 401) {
          setError(true)
          setLoading(false)
          return
        }
        const proximo = data.list[0]
        const mmPrevistos = proximo.rain ? proximo.rain["3h"] ?? 0 : 0
        const vientoMs = proximo.wind.speed

        setLluvia(mmPrevistos)
        setViento(vientoMs)
        onDatosActualizados?.(mmPrevistos, vientoMs)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [onDatosActualizados])

  if (error || loading) {
    return (
      <div className="space-y-2">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-20 mb-2"></div>
          <div className="h-6 bg-slate-700 rounded w-16"></div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-16 mb-2"></div>
          <div className="h-6 bg-slate-700 rounded w-16"></div>
        </div>
      </div>
    )
  }

  if (lluvia === null || viento === null) return null

  const riesgo = getRiesgoLluvia(lluvia)
  const RiesgoIcon = riesgo.icon

  const severityStyles = {
    critical: {
      badge: 'badge-critical',
      gradient: 'gradient-critical',
      color: 'text-red-300',
      icon: 'text-red-400'
    },
    warning: {
      badge: 'badge-warning',
      gradient: 'gradient-warning',
      color: 'text-orange-300',
      icon: 'text-orange-400'
    },
    info: {
      badge: 'badge-info',
      gradient: 'gradient-info',
      color: 'text-blue-300',
      icon: 'text-blue-400'
    },
    success: {
      badge: 'badge-success',
      gradient: 'gradient-success',
      color: 'text-green-300',
      icon: 'text-green-400'
    }
  }

  const styles = severityStyles[riesgo.severity]

  return (
    <div className="space-y-3">
      {/* Lluvia */}
      <div className={`card ${styles.gradient}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <CloudRain className={`w-5 h-5 ${styles.icon}`} />
            <span className="text-xs uppercase font-semibold text-slate-400">Próximas 3h</span>
          </div>
          <span className={`badge ${styles.badge}`}>{riesgo.label}</span>
        </div>
        <p className="text-2xl font-bold text-white mb-1">{lluvia.toFixed(1)} <span className="text-lg text-slate-400">mm</span></p>
        <p className={`text-xs ${styles.color} font-semibold flex items-center gap-1`}>
          <RiesgoIcon className="w-3 h-3" />
          {riesgo.desc}
        </p>
      </div>

      {/* Viento */}
      <div className="card gradient-info">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-cyan-400" />
            <span className="text-xs uppercase font-semibold text-slate-400">Viento</span>
          </div>
          {viento > 15 ? (
            <span className="badge badge-warning">Intenso</span>
          ) : viento > 8 ? (
            <span className="badge badge-info">Moderado</span>
          ) : (
            <span className="badge badge-success">Suave</span>
          )}
        </div>
        <p className="text-2xl font-bold text-white mb-1">{viento.toFixed(1)} <span className="text-lg text-slate-400">m/s</span></p>
        <p className="text-xs text-slate-400">
          {viento > 20 ? "Vientos peligrosos" : viento > 10 ? "Vientos intensos" : "Condición normal"}
        </p>
      </div>
    </div>
  )
}