import Nav from '@/components/Nav';
import Hero from '@/components/sections/Hero';
import Problem from '@/components/sections/Problem';
import MeetVault from '@/components/sections/MeetVault';
import WealthFeed from '@/components/sections/WealthFeed';
import VelocityScore from '@/components/sections/VelocityScore';
import Concierge from '@/components/sections/Concierge';
import Rituals from '@/components/sections/Rituals';
import Tiers from '@/components/sections/Tiers';
import Demo from '@/components/sections/Demo';
import Transformation from '@/components/sections/Transformation';
import WhyReturn from '@/components/sections/WhyReturn';
import Founding from '@/components/sections/Founding';
import Trust from '@/components/sections/Trust';
import FinalCTA from '@/components/sections/FinalCTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Problem />
        <MeetVault />
        <WealthFeed />
        <VelocityScore />
        <Concierge />
        <Rituals />
        <Tiers />
        <Demo />
        <Transformation />
        <WhyReturn />
        <Founding />
        <Trust />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
