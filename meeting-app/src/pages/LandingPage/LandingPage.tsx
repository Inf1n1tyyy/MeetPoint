import { LandingHeader } from "../../components/LandingHeader/LandingHeader.tsx";
import { Hero } from "../../components/Hero/Hero";
import { Features } from "../../components/Features/Features.tsx";

export const LandingPage = () => {
  return (
    <>
      <LandingHeader />

      <main>
        <Hero />

        <Features />
      </main>
    </>
  );
};
