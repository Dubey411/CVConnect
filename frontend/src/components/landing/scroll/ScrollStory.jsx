/**
 * ScrollStory.jsx
 * Mounts all GSAP-driven pinned scroll sections in sequence.
 * GSAP context is created once; all child sections register their
 * own ScrollTriggers inside useGSAP hooks that receive the same ctx.
 */
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import S2_ParseSection   from './S2_ParseSection';
import S3_KeywordSection from './S3_KeywordSection';
import S4_ATSGauge       from './S4_ATSGauge';
import S5_RewriteSection from './S5_RewriteSection';
import S6_HeatmapSection from './S6_HeatmapSection';
import S7_Pipeline       from './S7_Pipeline';
import S8_Dashboard      from './S8_Dashboard';
import S9_FeatureStack   from './S9_FeatureStack';
import S10_CTA           from './S10_CTA';

gsap.registerPlugin(ScrollTrigger);

export default function ScrollStory({ onGetStarted }) {
  useEffect(() => {
    // Refresh ScrollTrigger after all sections mount
    const id = setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => clearTimeout(id);
  }, []);

  return (
    <div id="scroll-story">
      <S2_ParseSection />
      <S3_KeywordSection />
      <S4_ATSGauge />
      <S5_RewriteSection />
      <S6_HeatmapSection />
      <S7_Pipeline />
      <S8_Dashboard />
      <S9_FeatureStack />
      <S10_CTA onGetStarted={onGetStarted} />
    </div>
  );
}
