'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  skeletonClassName?: string;
  priority?: boolean;
}

export function ImageWithSkeleton({
  src,
  alt,
  width,
  height,
  fill,
  className = '',
  skeletonClassName = '',
  priority = false,
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''}`}>
      {/* スケルトン */}
      {!loaded && (
        <div
          className={`absolute inset-0 bg-gray-800 animate-pulse rounded-inherit ${skeletonClassName}`}
          style={{ borderRadius: 'inherit' }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : (width ?? 100)}
        height={fill ? undefined : (height ?? 100)}
        fill={fill}
        unoptimized
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onLoad={() => setLoaded(true)}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
      />
    </div>
  );
}
