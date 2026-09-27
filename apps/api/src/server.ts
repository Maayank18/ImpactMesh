import { initRepository } from './data/repository'

const mongoLabel = await initRepository()
const { createApp } = await import('./app')
const { env, integrationMode, services } = await import('./config/env')

const app = createApp()
app.listen(env.port, () => {
  console.log(`ImpactMesh API on http://localhost:${env.port} (${integrationMode})`)
  console.log(
    `MongoDB ${mongoLabel} · Cloudinary ${services.cloudinary ? 'on' : 'off'} · Jev ${services.jev ? 'on' : 'off'} · Redis ${services.redis ? 'on' : 'off'}`,
  )
  console.log('The 3D graph is drawn in the browser with Three.js. It does not need a vendor API key.')
})
