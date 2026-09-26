import { BigWordmark } from '@/components/sections/BigWordmark'
import { Footer } from '@/components/sections/Footer'
import { Hero } from '@/components/sections/Hero'
import { Loader } from '@/components/sections/Loader'
import { Nav } from '@/components/sections/Nav'
import { Pledge } from '@/components/sections/Pledge'
import { Stack } from '@/components/sections/Stack'
import { Statement } from '@/components/sections/Statement'
import { Stats } from '@/components/sections/Stats'
import { useSeo } from '@/lib/seo'

export default function App() {
  useSeo({ path: '/' })
  return (
    <>
      <Loader />
      <Nav />
      <main>
        <Hero />
        <Stack />
        <Stats />
        <Pledge />
        <Statement />
        <BigWordmark />
      </main>
      <Footer />
    </>
  )
}
