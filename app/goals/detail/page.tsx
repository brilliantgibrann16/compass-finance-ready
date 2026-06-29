import { Suspense } from "react";
import { GoalDetailByQuery } from "./GoalDetailByQuery";

function GoalDetailFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold" />
    </div>
  );
}

export default function GoalDetailPage() {
  return (
    <Suspense fallback={<GoalDetailFallback />}>
      <GoalDetailByQuery />
    </Suspense>
  );
}