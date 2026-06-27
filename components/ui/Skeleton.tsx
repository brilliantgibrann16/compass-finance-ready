"use client";

import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "rect",
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-bg-hover",
        variant === "circle" && "rounded-full",
        variant === "text" && "h-4 rounded",
        variant === "rect" && "rounded-xl",
        className
      )}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl2 border border-border-soft bg-bg-raised p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="15%" />
      </div>
      <Skeleton variant="rect" height={8} className="mb-3" />
      <div className="flex justify-between">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="25%" />
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="flex flex-col items-center rounded-xl2 border border-border-soft bg-bg-raised p-6">
      <Skeleton variant="text" width="50%" className="mb-4" />
      <Skeleton variant="circle" width={200} height={200} className="mb-4" />
      <Skeleton variant="text" width="40%" className="mb-2" />
      <Skeleton variant="text" width="60%" />
    </div>
  );
}
