import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, MessageSquare, Cpu, TrendingUp, Bot } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { api, fmtCost, fmtTokens } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

interface Stats {
  total: { n: number; cost: number; tokens: number }
  by_agent: { name: string; color: string; n: number; cost: number; tokens: number }[]
  by_day: { day: string; n: number; cost: number }[]
  by_provider: { provider: string; n: number; cost: number }[]
}

const PIE_COLORS = ['#00f3ff', '#ff00ff', '#8a2be2', '#ffb800', '#10ff90', '#ff6b6b']

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      className="cyber-glass cyber-glass-hover rounded-2xl p-5 relative overflow-hidden"
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ backgroundColor: color }} />
      <Icon size={20} style={{ color }} className="mb-3" />
      <div className="text-2xl font-bold font-display">{value}</div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-white/30 mt-0.5">{sub}</div>}
    </motion.div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api('/stats').then(setStats).catch(() => {})
  }, [])

  if (!stats) {
    return <div className="text-white/40 text-sm">Chargement des statistiques...</div>
  }

  const empty = stats.total.n === 0

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Dépenses totales" value={fmtCost(stats.total.cost)} color="#ffb800" />
        <StatCard icon={MessageSquare} label="Requêtes IA" value={stats.total.n} color="#00f3ff" />
        <StatCard icon={Cpu} label="Tokens consommés" value={fmtTokens(stats.total.tokens)} color="#8a2be2" />
        <StatCard icon={Bot} label="Agents utilisés" value={stats.by_agent.length} color="#ff00ff" />
      </div>

      {empty ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="cyber-glass rounded-2xl p-10 text-center">
          <TrendingUp size={40} className="text-cyan-400/50 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucune activité pour l'instant</h3>
          <p className="text-white/50 text-sm mb-6">
            Commence à discuter avec un agent — chaque requête apparaîtra ici avec son coût.
          </p>
          <div className="flex gap-3 justify-center">
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/chat')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-sm font-bold">
              Ouvrir le chat
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/connectors')}
              className="px-5 py-2.5 rounded-xl cyber-glass text-sm">
              Connecter une clé API
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* dépenses par jour */}
            <div className="cyber-glass rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white/70 mb-4">DÉPENSES PAR JOUR</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.by_day}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f3ff" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#8a2be2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#ffffff60' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} />
                  <Tooltip
                    contentStyle={{ background: '#0a0a1a', border: '1px solid #00f3ff40', borderRadius: 8 }}
                    formatter={(value: any) => [fmtCost(Number(value)), 'Coût']}
                  />
                  <Area type="monotone" dataKey="cost" stroke="#00f3ff" fill="url(#costGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* répartition par agent */}
            <div className="cyber-glass rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white/70 mb-4">UTILISATION PAR AGENT</h3>
              <div className="flex items-center">
                <ResponsiveContainer width="55%" height={220}>
                  <PieChart>
                    <Pie data={stats.by_agent} dataKey="n" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                      {stats.by_agent.map((a, i) => (
                        <Cell key={i} fill={a.color || PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0a0a1a', border: '1px solid #00f3ff40', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {stats.by_agent.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 truncate text-white/70">{a.name}</span>
                      <span className="text-white/40">{a.n} req · {fmtCost(a.cost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* par provider */}
          <div className="cyber-glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white/70 mb-4">COÛT PAR PROVIDER</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.by_provider}>
                <XAxis dataKey="provider" tick={{ fontSize: 11, fill: '#ffffff60' }} />
                <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} />
                <Tooltip
                  contentStyle={{ background: '#0a0a1a', border: '1px solid #00f3ff40', borderRadius: 8 }}
                  formatter={(value: any) => [fmtCost(Number(value)), 'Coût']}
                />
                <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                  {stats.by_provider.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
