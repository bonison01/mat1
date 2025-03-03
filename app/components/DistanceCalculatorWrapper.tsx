'use client';
import dynamic from "next/dynamic";

const DistanceCalculator = dynamic(() => import("./DistanceCalculator"), {
  ssr: false, // Disable server-side rendering for this component
});

export default DistanceCalculator;
