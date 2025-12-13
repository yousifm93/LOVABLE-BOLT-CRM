import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AgentList from './AgentList';
export default function AgentListWrapper() {
  console.log("AgentListWrapper mounting...");
  return <ErrorBoundary fallback={<div className="p-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Real Estate Agents</h2>
          <p className="text-muted-foreground mb-4">
            There was an error loading the agent list. Please try refreshing the page.
          </p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
            Refresh Page
          </button>
        </div>}>
      <AgentList className="my-[5px]" />
    </ErrorBoundary>;
}