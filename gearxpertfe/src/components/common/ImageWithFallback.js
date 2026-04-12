import React, { useState } from 'react'

import errorImg from '../../assets/anhLoi.png';

const ERROR_IMG_SRC = errorImg;

export default function ImageWithFallback({ src, alt, className, style, fallback, ...rest }) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
  };

  const finalFallback = fallback || ERROR_IMG_SRC;

  // If we have an error or no source, show the fallback image
  if (didError || !src) {
    return (
      <div 
        className={`bg-slate-50 flex items-center justify-center overflow-hidden h-full w-full ${className || ""}`}
        style={style}
      >
        <img
          src={finalFallback}
          alt="Failed to load"
          className="w-full h-full object-cover opacity-60"
          {...rest}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || ""}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  );
}
