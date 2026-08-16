import React, {useState, useEffect} from "react";
import {useAuth} from "@/hooks/use-auth";

export const DebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const {user, loading} = useAuth();

  useEffect(() => {
    // Override console.log to capture logs
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      addLog(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg)
          )
          .join(" ")
      );
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  const addLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, 50));
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-2 right-2 bg-black/70 text-white px-3 py-1 text-xs rounded z-50"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 right-2 w-96 h-64 bg-black/70 text-white p-4 rounded z-50 overflow-auto">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-xs hover:text-gray-300"
        >
          Close
        </button>
      </div>
      <div className="text-xs space-y-1">
        <div className="font-bold">Auth State:</div>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify({user, loading}, null, 2)}
        </pre>
        <div className="font-bold mt-2">Recent Logs:</div>
        {logs.map((log, i) => (
          <div key={i} className="text-gray-300">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugPanel;
