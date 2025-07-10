import React, { useEffect } from "react";

const DummyAnimation = ({ onAnimationEnd }) => {
  useEffect(() => {
    // console.log("Animation started");
    const timer = setTimeout(() => {
      // console.log("Animation ended");
      onAnimationEnd();
    }, 6000);
    return () => {
      // console.log("Animation cleanup");
      clearTimeout(timer);
    };
  }, [onAnimationEnd]);

  return (
    <div className="bg-blue-500 text-white p-6 rounded-lg text-center">
      <p className="text-2xl font-bold">Dummy Animation Running...</p>
    </div>
  );
};

export default DummyAnimation;