import { env, integrationMode, services } from './config/env'
import { initRepository } from './data/repository'
import { createApp } from './app'

const mongoLabel = await initRepository()

const app = createApp()
app.listen(env.port, () => {
  console.log(`ImpactMesh API on http://localhost:${env.port} (${integrationMode})`)
  console.log(
    `MongoDB ${mongoLabel} · Cloudinary ${services.cloudinary ? 'on' : 'off'} · Jev ${services.jev ? 'on' : 'off'} · Redis ${services.redis ? 'on' : 'off'}`,
  )
  console.log('The 3D graph is drawn in the browser with Three.js. It does not need a vendor API key.')
})
